require("dotenv").config();
const express = require("express"); 
const cors = require("cors");

const app = express(); //express application

app.use(cors()); //app should use cors
app.use(express.json()); //app should read json data from requests

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ROUTES
const authRoutes = require("./routes/auth");
const socialRoutes = require("./routes/social");
const snapsRoutes = require("./routes/snaps");
const storiesRoutes = require("./routes/stories");

app.use("/api", authRoutes);
app.use("/api", socialRoutes);
app.use("/api/snaps", snapsRoutes);
app.use("/api/stories", storiesRoutes);

// Static folders
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});