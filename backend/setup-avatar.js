const db = require("./db");

async function setupAvatarColumn() {
    try {
        console.log("Adding avatar_url column to users table...");
        await db.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
        `);
        console.log("avatar_url column added/verified.");
        process.exit(0);
    } catch (err) {
        console.error("Error setting up avatar column:", err);
        process.exit(1);
    }
}

setupAvatarColumn();
