const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

// Configure storage for Lost & Found photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "_lostfound" + path.extname(file.originalname))
});
const upload = multer({ storage });

// ==========================================
// 1. MOODS API
// ==========================================

// Update user's current mood
router.post("/mood", async (req, res) => {
    try {
        const user_id = req.session?.user?.id || req.body.user_id;
        if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { current_mood, mood_emoji, mood_text } = req.body;
        
        await db.query(
            `UPDATE users 
             SET current_mood = $1, mood_emoji = $2, mood_text = $3, mood_updated_at = NOW() 
             WHERE id = $4`,
            [current_mood || null, mood_emoji || null, mood_text || null, user_id]
        );

        // Update session if active
        if (req.session?.user) {
            req.session.user.current_mood = current_mood;
            req.session.user.mood_emoji = mood_emoji;
            req.session.user.mood_text = mood_text;
        }

        res.json({ success: true, message: "Mood updated successfully" });
    } catch (err) {
        console.error("Update mood error:", err);
        res.status(500).json({ success: false, message: "Server error updating mood" });
    }
});

// Get all active moods of friends / campus users
router.get("/moods", async (req, res) => {
    try {
        const user_id = req.session?.user?.id || req.query.user_id;
        
        // Fetch all campus users who have set a mood in the last 24 hours
        const result = await db.query(
            `SELECT id, username, avatar_url, current_mood, mood_emoji, mood_text, mood_updated_at 
             FROM users 
             WHERE current_mood IS NOT NULL AND mood_updated_at >= NOW() - INTERVAL '24 HOURS'
             ORDER BY mood_updated_at DESC`
        );
        res.json({ success: true, moods: result.rows });
    } catch (err) {
        console.error("Get moods error:", err);
        res.status(500).json({ success: false, message: "Server error fetching moods" });
    }
});

// ==========================================
// 2. STUDY STATUS API
// ==========================================

// Update user's study status
router.post("/study", async (req, res) => {
    try {
        const user_id = req.session?.user?.id || req.body.user_id;
        if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { is_studying, study_subject, study_details } = req.body;

        await db.query(
            `UPDATE users 
             SET is_studying = $1, study_subject = $2, study_details = $3, study_started_at = NOW() 
             WHERE id = $4`,
            [!!is_studying, study_subject || null, study_details || null, user_id]
        );

        // Update session if active
        if (req.session?.user) {
            req.session.user.is_studying = !!is_studying;
            req.session.user.study_subject = study_subject;
            req.session.user.study_details = study_details;
        }

        res.json({ success: true, message: "Study status updated successfully" });
    } catch (err) {
        console.error("Update study status error:", err);
        res.status(500).json({ success: false, message: "Server error updating study status" });
    }
});

// Get active studying users on campus
router.get("/study/active", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, avatar_url, study_subject, study_details, study_started_at 
             FROM users 
             WHERE is_studying = TRUE AND study_started_at >= NOW() - INTERVAL '8 HOURS'
             ORDER BY study_started_at DESC`
        );
        res.json({ success: true, activeStudents: result.rows });
    } catch (err) {
        console.error("Get active students error:", err);
        res.status(500).json({ success: false, message: "Server error fetching study sessions" });
    }
});

// ==========================================
// 3. LOST & FOUND API
// ==========================================

// Get all lost & found items
router.get("/lost-found", async (req, res) => {
    try {
        const result = await db.query(
            `SELECT lf.*, u.username, u.avatar_url 
             FROM lost_found_items lf
             JOIN users u ON lf.user_id = u.id
             ORDER BY lf.created_at DESC`
        );
        res.json({ success: true, items: result.rows });
    } catch (err) {
        console.error("Get lost & found error:", err);
        res.status(500).json({ success: false, message: "Server error fetching lost & found items" });
    }
});

// Report lost/found item
router.post("/lost-found", upload.single("photo"), async (req, res) => {
    try {
        const user_id = req.session?.user?.id || req.body.user_id;
        if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { title, description, item_type, location, contact } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!title || !description || !item_type) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const result = await db.query(
            `INSERT INTO lost_found_items (user_id, title, description, item_type, location, contact, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [user_id, title, description, item_type, location || null, contact || null, image_url]
        );

        res.json({ success: true, item: result.rows[0] });
    } catch (err) {
        console.error("Report lost & found item error:", err);
        res.status(500).json({ success: false, message: "Server error reporting lost/found item" });
    }
});

// Resolve reported item
router.post("/lost-found/:id/resolve", async (req, res) => {
    try {
        const user_id = req.session?.user?.id || req.body.user_id;
        if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { id } = req.params;

        // Verify user owns the item report
        const check = await db.query("SELECT user_id FROM lost_found_items WHERE id = $1", [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        if (check.rows[0].user_id !== parseInt(user_id)) {
            return res.status(403).json({ success: false, message: "You can only resolve your own reports" });
        }

        await db.query(
            "UPDATE lost_found_items SET status = 'resolved' WHERE id = $1",
            [id]
        );

        res.json({ success: true, message: "Item status marked as resolved" });
    } catch (err) {
        console.error("Resolve item error:", err);
        res.status(500).json({ success: false, message: "Server error resolving item" });
    }
});

module.exports = router;
