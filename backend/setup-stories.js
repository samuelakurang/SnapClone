const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:samuel@localhost:5432/snapclone' });

async function run() {
    try {
        await client.connect();
        console.log("Setting up stories table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS stories (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                media_url TEXT NOT NULL,
                caption TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
            )
        `);
        console.log("Stories table ready.");
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
