const express = require("express");
const router = express.Router();

// TEMP STORAGE (we'll use DB later)
let users = [];

// SIGNUP
router.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  // check if user exists
  const userExists = users.find(u => u.email === email);

  if (userExists) {
    return res.json({ success: false, message: "User already exists" });
  }

  // save user
  users.push({ username, email, password });

  res.json({ success: true, message: "Signup successful" });
});

// LOGIN
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.json({ success: false, message: "Invalid credentials" });
  }

  res.json({ success: true, message: "Login successful" });
});

module.exports = router;