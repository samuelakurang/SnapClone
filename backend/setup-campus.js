const db = require("./db");

async function setupCampusTables() {
    try {
        console.log("Setting up Campus Feed tables...");

        // 1. Campus Posts Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS campus_posts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT,
                media_url VARCHAR(255),
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("campus_posts table created/verified.");

        // 2. Campus Comments Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS campus_comments (
                id SERIAL PRIMARY KEY,
                post_id INTEGER REFERENCES campus_posts(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("campus_comments table created/verified.");

        // 3. Campus Likes Table (to prevent double liking)
        await db.query(`
            CREATE TABLE IF NOT EXISTS campus_likes (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER REFERENCES campus_posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, post_id)
            );
        `);
        console.log("campus_likes table created/verified.");

        console.log("Campus database setup complete.");
        process.exit(0);
    } catch (err) {
        console.error("Error setting up Campus tables:", err);
        process.exit(1);
    }
}

setupCampusTables();
