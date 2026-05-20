require("dotenv").config();
const express = require("express"); 
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow any localhost origin (5500, 5501, etc.)
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || "snapclone_secret_123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve Static Uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Check Session Status
app.get("/api/auth/status", (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.json({ success: false, message: "Not authenticated" });
  }
});

// ROUTES
const authRoutes = require("./routes/auth");
const socialRoutes = require("./routes/social");
const snapsRoutes = require("./routes/snaps");
const storiesRoutes = require("./routes/stories");
const locationRoutes = require("./routes/location");
const spotlightRoutes = require("./routes/spotlight");
const campusRoutes = require("./routes/campus");
const avatarRoutes = require("./routes/avatar");
const featuresRoutes = require("./routes/features");

app.use("/api", authRoutes);
app.use("/api", socialRoutes);
app.use("/api/snaps", snapsRoutes);
app.use("/api/stories", storiesRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/spotlight", spotlightRoutes);
app.use("/api/campus", campusRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/features", featuresRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});