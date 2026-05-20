const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require('google-auth-library');
const db = require("../db");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// SIGNUP
router.post("/signup", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // Validation
  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Passwords do not match" });
  }

  try {
    // Check if user exists
    const userExists = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUserResult = await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, avatar_url, current_mood, mood_emoji, mood_text, is_studying, study_subject, study_details",
      [username, email, hashedPassword]
    );
    const newUser = newUserResult.rows[0];

    // --- SNAPBOT ONBOARDING ---
    try {
      const botResult = await db.query("SELECT id FROM users WHERE username = 'SnapBot' LIMIT 1");
      if (botResult.rows.length > 0) {
        const botId = botResult.rows[0].id;
        // Auto-friend
        await db.query("INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, 'accepted')", [newUser.id, botId]);
        // Welcome Message
        await db.query(
          "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)",
          [botId, newUser.id, `Welcome to SnapClone, ${newUser.username}! 👻 I'm SnapBot. Use me to test chats, send snaps, and explore updates!`]
        );
      }
    } catch (botErr) {
      console.error("Bot onboarding failed", botErr);
    }

    // Set session
    req.session.user = newUser;

    res.json({ success: true, message: "Signup successful", user: newUser });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check user
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const userData = { 
      id: user.id, 
      username: user.username, 
      email: user.email,
      avatar_url: user.avatar_url,
      current_mood: user.current_mood,
      mood_emoji: user.mood_emoji,
      mood_text: user.mood_text,
      is_studying: user.is_studying,
      study_subject: user.study_subject,
      study_details: user.study_details
    };
    
    // Set session
    req.session.user = userData;

    res.json({ 
      success: true, 
      message: "Login successful", 
      user: userData 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  try {
    const userResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email]);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// GOOGLE LOGIN (Placeholder logic)
router.post("/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub } = payload;

    // Check if user exists, else create
    let user = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) {
      // Create user with random password since they login with Google
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await db.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, avatar_url, current_mood, mood_emoji, mood_text, is_studying, study_subject, study_details",
        [name, email, randomPassword]
      );
    }

    const matchedUser = user.rows[0];
    const userData = {
      id: matchedUser.id,
      username: matchedUser.username,
      email: matchedUser.email,
      avatar_url: matchedUser.avatar_url,
      current_mood: matchedUser.current_mood,
      mood_emoji: matchedUser.mood_emoji,
      mood_text: matchedUser.mood_text,
      is_studying: matchedUser.is_studying,
      study_subject: matchedUser.study_subject,
      study_details: matchedUser.study_details
    };

    res.json({ 
      success: true, 
      user: userData
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: "Google Auth failed" });
  }
});

module.exports = router;