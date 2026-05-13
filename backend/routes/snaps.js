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
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Send a Snap (Supports Multiple Recipients)
router.post("/send", upload.single("media"), async (req, res) => {
    try {
        const { sender_id, receiver_ids, caption } = req.body; // receiver_ids can be a single ID or a comma-separated string
        const media_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!media_url) return res.status(400).json({ success: false, message: "Media is required" });

        const ids = Array.isArray(receiver_ids) ? receiver_ids : receiver_ids.split(",");
        const snaps = [];

        for (const r_id of ids) {
            // 1. Save to snaps table
            const snapResult = await db.query(
                "INSERT INTO snaps (sender_id, receiver_id, media_url, caption) VALUES ($1, $2, $3, $4) RETURNING *",
                [sender_id, r_id, media_url, caption]
            );
            const snap = snapResult.rows[0];
            snaps.push(snap);

            // 2. Create entry in messages table for chat integration
            await db.query(
                "INSERT INTO messages (sender_id, receiver_id, content, type, snap_id) VALUES ($1, $2, $3, $4, $5)",
                [sender_id, r_id, "Sent a Snap! 📸", "snap", snap.id]
            );

            // 3. Update friends activity for sorting
            await db.query(
                "UPDATE friends SET updated_at = CURRENT_TIMESTAMP WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
                [sender_id, r_id]
            );
        }

        res.json({ success: true, snaps: snaps });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get received snaps for a user
router.get("/received/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await db.query(
            "SELECT s.*, u.username as sender_name FROM snaps s JOIN users u ON s.sender_id = u.id WHERE receiver_id = $1 AND viewed = false ORDER BY created_at DESC",
            [user_id]
        );
        res.json({ success: true, snaps: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get single snap details
router.get("/:snap_id", async (req, res) => {
    try {
        const { snap_id } = req.params;
        const result = await db.query(
            "SELECT s.*, u.username as sender_name FROM snaps s JOIN users u ON s.sender_id = u.id WHERE s.id = $1",
            [snap_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Snap not found" });
        res.json({ success: true, snap: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark snap as viewed
router.post("/view/:snap_id", async (req, res) => {
    try {
        const { snap_id } = req.params;
        await db.query("UPDATE snaps SET viewed = true WHERE id = $1", [snap_id]);
        res.json({ success: true, message: "Snap marked as viewed" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
