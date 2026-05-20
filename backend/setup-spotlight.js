const db = require("./db");

async function setupSpotlightTable() {
    try {
        console.log("Setting up spotlight table...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS spotlight (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                media_url VARCHAR(255) NOT NULL,
                caption TEXT,
                likes_count INTEGER DEFAULT 0,
                views_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("spotlight table is ready.");
        process.exit(0);
    } catch (err) {
        console.error("Error setting up spotlight table:", err);
        process.exit(1);
    }
}

setupSpotlightTable();
