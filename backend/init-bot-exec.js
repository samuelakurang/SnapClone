const db = require("./db");
const fs = require("fs");
const path = require("path");

async function initBot() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, "../database/init_bot.sql"), "utf8");
        console.log("Executing init_bot.sql...");
        await db.query(sql);
        
        console.log("Ensuring all users are friends with SnapBot...");
        const botResult = await db.query("SELECT id FROM users WHERE username = 'SnapBot' LIMIT 1");
        if (botResult.rows.length > 0) {
            const botId = botResult.rows[0].id;
            // Add SnapBot as a friend to everyone who doesn't have it
            await db.query(`
                INSERT INTO friends (user_id, friend_id, status)
                SELECT id, $1, 'accepted' FROM users 
                WHERE id != $1 
                AND id NOT IN (
                    SELECT user_id FROM friends WHERE friend_id = $1
                    UNION
                    SELECT friend_id FROM friends WHERE user_id = $1
                )
            `, [botId]);

            // Send a welcome message to those who don't have any messages with SnapBot
            await db.query(`
                INSERT INTO messages (sender_id, receiver_id, content)
                SELECT $1, id, 'Hey there! I am SnapBot. Ready to test some snaps? 👻' FROM users
                WHERE id != $1
                AND id NOT IN (
                    SELECT sender_id FROM messages WHERE receiver_id = $1
                    UNION
                    SELECT receiver_id FROM messages WHERE sender_id = $1
                )
            `, [botId]);
            console.log("SnapBot connection established for all users.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Initialization failed:", err);
        process.exit(1);
    }
}

initBot();
