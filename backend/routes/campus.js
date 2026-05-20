const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();
};

// Multer storage config for Campus Feed
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_campus" + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 1. Fetch Campus Feed
router.get("/feed", async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, 
                p.content, 
                p.media_url, 
                p.likes_count, 
                p.comments_count, 
                p.created_at, 
                u.username,
                u.id as author_id
            FROM campus_posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 50
        `;
        const result = await db.query(query);

        // If user is logged in, fetch their likes to show active state
        let userLikes = [];
        if (req.session && req.session.user) {
            const likesQuery = `SELECT post_id FROM campus_likes WHERE user_id = $1`;
            const likesResult = await db.query(likesQuery, [req.session.user.id]);
            userLikes = likesResult.rows.map(row => row.post_id);
        }

        res.json({ success: true, feed: result.rows, userLikes: userLikes });
    } catch (err) {
        console.error("Error fetching campus feed:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Create a Post
router.post("/post", upload.single("media"), async (req, res) => {
    try {
        const user_id = req.session.user ? req.session.user.id : req.body.user_id;
        const { content } = req.body;
        const media_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (!content && !media_url) return res.status(400).json({ success: false, message: "Post must contain text or media" });

        const result = await db.query(
            "INSERT INTO campus_posts (user_id, content, media_url) VALUES ($1, $2, $3) RETURNING *",
            [user_id, content, media_url]
        );

        res.json({ success: true, post: result.rows[0] });
    } catch (err) {
        console.error("Error creating campus post:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. Delete a Post
router.delete("/post/:id", requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.session.user.id;

        // Verify ownership before deleting
        const checkQuery = "SELECT user_id FROM campus_posts WHERE id = $1";
        const checkResult = await db.query(checkQuery, [postId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        if (checkResult.rows[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: "Forbidden: You can only delete your own posts" });
        }

        await db.query("DELETE FROM campus_posts WHERE id = $1", [postId]);
        res.json({ success: true, message: "Post deleted successfully" });
    } catch (err) {
        console.error("Error deleting post:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 4. Toggle Like on a Post
router.post("/post/:id/like", requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.session.user.id;

        // Check if already liked
        const checkLike = await db.query("SELECT * FROM campus_likes WHERE user_id = $1 AND post_id = $2", [userId, postId]);

        if (checkLike.rows.length > 0) {
            // Unlike
            await db.query("DELETE FROM campus_likes WHERE user_id = $1 AND post_id = $2", [userId, postId]);
            const updatedPost = await db.query("UPDATE campus_posts SET likes_count = likes_count - 1 WHERE id = $1 RETURNING likes_count", [postId]);
            res.json({ success: true, liked: false, likes_count: updatedPost.rows[0].likes_count });
        } else {
            // Like
            await db.query("INSERT INTO campus_likes (user_id, post_id) VALUES ($1, $2)", [userId, postId]);
            const updatedPost = await db.query("UPDATE campus_posts SET likes_count = likes_count + 1 WHERE id = $1 RETURNING likes_count", [postId]);
            res.json({ success: true, liked: true, likes_count: updatedPost.rows[0].likes_count });
        }
    } catch (err) {
        console.error("Error toggling like:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 5. Fetch Comments for a Post
router.get("/post/:id/comments", async (req, res) => {
    try {
        const postId = req.params.id;
        const query = `
            SELECT 
                c.id, 
                c.content, 
                c.created_at, 
                u.username,
                u.id as author_id
            FROM campus_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await db.query(query, [postId]);

        res.json({ success: true, comments: result.rows });
    } catch (err) {
        console.error("Error fetching comments:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 6. Add a Comment
router.post("/post/:id/comment", requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.session.user.id;
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ success: false, message: "Comment cannot be empty" });
        }

        // Insert comment
        const result = await db.query(
            "INSERT INTO campus_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *",
            [postId, userId, content]
        );

        // Increment comment count on post
        await db.query("UPDATE campus_posts SET comments_count = comments_count + 1 WHERE id = $1", [postId]);

        // Get username for the response
        const userResult = await db.query("SELECT username FROM users WHERE id = $1", [userId]);

        const newComment = {
            ...result.rows[0],
            username: userResult.rows[0].username,
            author_id: userId
        };

        res.json({ success: true, comment: newComment });
    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
