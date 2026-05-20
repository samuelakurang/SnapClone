const express = require("express");
const router = express.Router();
const db = require("../db");

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();
};

// 1. Update User Location
router.post("/update", requireAuth, async (req, res) => {
    try {
        const user_id = req.session.user.id;
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ success: false, message: "Latitude and longitude are required" });
        }

        const query = `
            INSERT INTO user_locations (user_id, latitude, longitude, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                latitude = EXCLUDED.latitude, 
                longitude = EXCLUDED.longitude, 
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        
        const result = await db.query(query, [user_id, latitude, longitude]);

        res.json({ success: true, location: result.rows[0] });
    } catch (err) {
        console.error("Error updating location:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Fetch Friends' Locations
router.get("/friends", requireAuth, async (req, res) => {
    try {
        const user_id = req.session.user.id;

        // Fetch locations of users who are friends with the current user
        // and whose visibility is not 'ghost'
        const query = `
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.avatar_url,
                l.latitude, 
                l.longitude, 
                l.updated_at
            FROM users u
            JOIN friends f ON (f.user_id = $1 AND f.friend_id = u.id) OR (f.friend_id = $1 AND f.user_id = u.id)
            JOIN user_locations l ON l.user_id = u.id
            WHERE f.status = 'accepted' AND l.visibility != 'ghost'
        `;

        const result = await db.query(query, [user_id]);

        res.json({ success: true, friends_locations: result.rows });
    } catch (err) {
        console.error("Error fetching friends locations:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. Get Current Visibility Settings
router.get("/visibility", requireAuth, async (req, res) => {
    try {
        const user_id = req.session.user.id;
        const query = `SELECT visibility FROM user_locations WHERE user_id = $1`;
        const result = await db.query(query, [user_id]);
        
        if (result.rows.length > 0) {
            res.json({ success: true, visibility: result.rows[0].visibility });
        } else {
            res.json({ success: true, visibility: 'public' }); // Default if no location yet
        }
    } catch (err) {
        console.error("Error getting visibility:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 4. Update Visibility (Ghost Mode)
router.post("/visibility", requireAuth, async (req, res) => {
    try {
        const user_id = req.session.user.id;
        const { visibility } = req.body; // 'public' or 'ghost'

        if (!['public', 'ghost'].includes(visibility)) {
            return res.status(400).json({ success: false, message: "Invalid visibility status" });
        }

        // If user doesn't have a location record yet, we shouldn't insert a blank one just for visibility,
        // but we could. For simplicity, we just update if it exists.
        // It's better to upsert with default lat/lng 0 if we really need to save the setting before they grant location access,
        // but usually they toggle ghost mode after seeing the map.
        const query = `
            UPDATE user_locations 
            SET visibility = $1 
            WHERE user_id = $2
            RETURNING visibility;
        `;
        
        const result = await db.query(query, [visibility, user_id]);
        
        if (result.rows.length > 0) {
            res.json({ success: true, visibility: result.rows[0].visibility });
        } else {
            // Upsert empty location with ghost mode just to save the preference
            const upsertQuery = `
                 INSERT INTO user_locations (user_id, latitude, longitude, visibility)
                 VALUES ($1, 0, 0, $2)
                 ON CONFLICT (user_id) DO UPDATE SET visibility = EXCLUDED.visibility
                 RETURNING visibility;
            `;
            const upsertResult = await db.query(upsertQuery, [user_id, visibility]);
            res.json({ success: true, visibility: upsertResult.rows[0].visibility });
        }
    } catch (err) {
        console.error("Error updating visibility:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
