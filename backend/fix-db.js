const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:samuel@localhost:5432/snapclone' });

async function run() {
    try {
        await client.connect();
        console.log("Adding columns to messages...");
        await client.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'text'");
        await client.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS snap_id INT REFERENCES snaps(id) ON DELETE SET NULL");
        console.log("Columns added successfully.");
        
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'messages'");
        console.log("Current columns:", res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
