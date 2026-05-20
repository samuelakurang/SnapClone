const db = require("./db");

async function setupLocationTable() {
    try {
        console.log("Setting up user_locations table...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_locations (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                visibility VARCHAR(20) DEFAULT 'public',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("user_locations table is ready.");
        process.exit(0);
    } catch (err) {
        console.error("Error setting up user_locations table:", err);
        process.exit(1);
    }
}

setupLocationTable();
