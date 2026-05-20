const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const DEEPAI_API_KEY = process.env.DEEPAI_API_KEY;

// Multer storage for uploaded photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "_avatar" + path.extname(file.originalname))
});
const upload = multer({ storage });

// POST /api/avatar/upload - Upload and save
router.post("/upload", upload.single("photo"), async (req, res) => {
    try {
        const user_id = req.session?.user?.id || req.body.user_id;
        if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (!req.file) return res.status(400).json({ success: false, message: "No photo uploaded" });

        const avatarUrl = `/uploads/${req.file.filename}`;

        // Save avatar_url to database
        await db.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [avatarUrl, user_id]);

        // Update session if available
        if (req.session?.user) {
            req.session.user.avatar_url = avatarUrl;
        }

        res.json({ success: true, avatar_url: avatarUrl });

    } catch (err) {
        console.error("Avatar upload error:", err);
        res.status(500).json({ success: false, message: "Server error during avatar upload." });
    }
});

// GET /api/avatar/:userId - Fetch a user's avatar URL
router.get("/:userId", async (req, res) => {
    try {
        const result = await db.query("SELECT avatar_url, username FROM users WHERE id = $1", [req.params.userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json({ success: true, avatar_url: result.rows[0].avatar_url, username: result.rows[0].username });
    } catch (err) {
        console.error("Fetch avatar error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
