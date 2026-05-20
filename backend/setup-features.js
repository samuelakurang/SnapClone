const db = require("./db");

async function setupFeatures() {
    try {
        console.log("Setting up database columns for Moods and Study Status...");
        
        // 1. Add Mood columns to users table
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS current_mood VARCHAR(50),
            ADD COLUMN IF NOT EXISTS mood_emoji VARCHAR(10),
            ADD COLUMN IF NOT EXISTS mood_text VARCHAR(255),
            ADD COLUMN IF NOT EXISTS mood_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);
        console.log("Mood columns verified.");

        // 2. Add Study Status columns to users table
        await db.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_studying BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS study_subject VARCHAR(100),
            ADD COLUMN IF NOT EXISTS study_details VARCHAR(255),
            ADD COLUMN IF NOT EXISTS study_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);
        console.log("Study Status columns verified.");

        // 3. Create lost_found_items table
        console.log("Creating lost_found_items table if not exists...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS lost_found_items (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(150) NOT NULL,
                description TEXT NOT NULL,
                item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('lost', 'found')),
                location VARCHAR(150),
                contact VARCHAR(100),
                image_url VARCHAR(255),
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("lost_found_items table verified.");

        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

setupFeatures();
