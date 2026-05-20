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

// Multer storage config for Spotlight
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_spotlight" + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 1. Upload to Spotlight
router.post("/upload", upload.single("media"), async (req, res) => {
    try {
        const user_id = req.session.user ? req.session.user.id : req.body.user_id;
        const { caption } = req.body;
        const media_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (!media_url) return res.status(400).json({ success: false, message: "Media file is required" });

        const result = await db.query(
            "INSERT INTO spotlight (user_id, media_url, caption) VALUES ($1, $2, $3) RETURNING *",
            [user_id, media_url, caption]
        );

        res.json({ success: true, post: result.rows[0] });
    } catch (err) {
        console.error("Error uploading to spotlight:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Fetch Spotlight Feed
router.get("/feed", async (req, res) => {
    try {
        // Fetch posts descending by created_at. Joining users to get username.
        const query = `
            SELECT 
                s.id, 
                s.media_url, 
                s.caption, 
                s.likes_count, 
                s.views_count, 
                s.created_at, 
                u.username,
                u.id as author_id
            FROM spotlight s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC
            LIMIT 50
        `;
        const result = await db.query(query);

        res.json({ success: true, feed: result.rows });
    } catch (err) {
        console.error("Error fetching spotlight feed:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. Like a Post
router.post("/:id/like", requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        
        // In a real app, we'd check if the user already liked it in a separate table
        // to prevent infinite liking. For now, we just increment.
        const result = await db.query(
            "UPDATE spotlight SET likes_count = likes_count + 1 WHERE id = $1 RETURNING likes_count",
            [postId]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, likes_count: result.rows[0].likes_count });
        } else {
            res.status(404).json({ success: false, message: "Post not found" });
        }
    } catch (err) {
        console.error("Error liking post:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 4. Record a View
router.post("/:id/view", async (req, res) => {
    try {
        const postId = req.params.id;
        
        const result = await db.query(
            "UPDATE spotlight SET views_count = views_count + 1 WHERE id = $1 RETURNING views_count",
            [postId]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, views_count: result.rows[0].views_count });
        } else {
            res.status(404).json({ success: false, message: "Post not found" });
        }
    } catch (err) {
        console.error("Error updating view count:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
