const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// SAMPLE LOGIN ROUTE
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  res.send(`Login attempt for ${email}`);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});