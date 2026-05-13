const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_story" + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Post a Story
router.post("/add", upload.single("media"), async (req, res) => {
    try {
        const { user_id, caption } = req.body;
        const media_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!media_url) return res.status(400).json({ success: false, message: "Media is required for stories" });

        const result = await db.query(
            "INSERT INTO stories (user_id, media_url, caption) VALUES ($1, $2, $3) RETURNING *",
            [user_id, media_url, caption]
        );

        res.json({ success: true, story: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Stories (Own + Friends)
router.get("/all/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        // Fetch stories from self and accepted friends that haven't expired
        const result = await db.query(
            `SELECT s.*, u.username 
             FROM stories s 
             JOIN users u ON s.user_id = u.id 
             WHERE (s.user_id = $1 OR s.user_id IN (
                 SELECT user_id FROM friends WHERE friend_id = $1 AND status = 'accepted'
                 UNION
                 SELECT friend_id FROM friends WHERE user_id = $1 AND status = 'accepted'
             ))
             AND s.expires_at > CURRENT_TIMESTAMP
             ORDER BY s.created_at DESC`,
            [user_id]
        );
        res.json({ success: true, stories: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
