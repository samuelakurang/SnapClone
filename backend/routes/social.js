const express = require("express");
const router = express.Router();
const db = require("../db");

// --- FRIENDS ---

// Get all ACCEPTED friends with latest message preview for a user
router.get("/friends/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await db.query(
            `SELECT u.id, u.username, 
                (SELECT content FROM messages 
                 WHERE (sender_id = u.id AND receiver_id = $1) 
                 OR (sender_id = $1 AND receiver_id = u.id) 
                 ORDER BY created_at DESC LIMIT 1) as last_msg,
                (SELECT created_at FROM messages 
                 WHERE (sender_id = u.id AND receiver_id = $1) 
                 OR (sender_id = $1 AND receiver_id = u.id) 
                 ORDER BY created_at DESC LIMIT 1) as last_msg_time
             FROM users u 
             JOIN friends f ON (f.user_id = u.id OR f.friend_id = u.id) 
             WHERE (f.user_id = $1 OR f.friend_id = $1) 
             AND u.id != $1 
             AND f.status = 'accepted'
             ORDER BY last_msg_time DESC NULLS LAST`,
            [user_id]
        );
        res.json({ success: true, friends: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get pending friend requests received
router.get("/friend-requests/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await db.query(
            `SELECT u.id, u.username FROM users u
             JOIN friends f ON f.user_id = u.id
             WHERE f.friend_id = $1 AND f.status = 'pending'`,
            [user_id]
        );
        res.json({ success: true, requests: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Send a friend request
router.post("/friends/request", async (req, res) => {
    try {
        const { sender_id, receiver_id } = req.body;
        const check = await db.query(
            "SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
            [sender_id, receiver_id]
        );
        if (check.rows.length > 0) return res.json({ success: false, message: "Request already exists or already friends" });

        await db.query("INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, 'pending')", [sender_id, receiver_id]);
        res.json({ success: true, message: "Friend request sent!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Respond to friend request (accept/reject)
router.post("/friends/respond", async (req, res) => {
    try {
        const { user_id, friend_id, action } = req.body;
        if (action === 'accept') {
            await db.query(
                "UPDATE friends SET status = 'accepted' WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
                [user_id, friend_id]
            );
            res.json({ success: true, message: "Request accepted!" });
        } else {
            await db.query(
                "DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
                [user_id, friend_id]
            );
            res.json({ success: true, message: "Request rejected" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Search for users
router.get("/users/search", async (req, res) => {
    try {
        const { query, current_user_id } = req.query;
        const result = await db.query(
            `SELECT id, username FROM users 
             WHERE username ILIKE $1 AND id != $2 
             AND id NOT IN (SELECT user_id FROM friends WHERE friend_id = $2 UNION SELECT friend_id FROM friends WHERE user_id = $2)
             LIMIT 10`,
            [`%${query}%`, current_user_id]
        );
        res.json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- MESSAGES ---

// Get chat history
router.get("/messages/:user_id/:friend_id", async (req, res) => {
    try {
        const { user_id, friend_id } = req.params;
        const result = await db.query(
            `SELECT * FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) 
             OR (sender_id = $2 AND receiver_id = $1) 
             ORDER BY created_at ASC`,
            [user_id, friend_id]
        );
        res.json({ success: true, messages: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Send a message
router.post("/messages/send", async (req, res) => {
    try {
        const { sender_id, receiver_id, content } = req.body;
        const result = await db.query(
            "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *",
            [sender_id, receiver_id, content]
        );
        // Also update friends table activity timestamp for sorting
        await db.query(
            "UPDATE friends SET updated_at = CURRENT_TIMESTAMP WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
            [sender_id, receiver_id]
        );
        res.json({ success: true, message: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
