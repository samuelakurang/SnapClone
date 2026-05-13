const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:samuel@localhost:5432/snapclone' });

async function run() {
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'friends'");
        console.log("Friends table columns:", res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
