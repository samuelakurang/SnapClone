require("dotenv").config();
const express = require("express"); 
const cors = require("cors");

const app = express(); //express application

app.use(cors()); //app should use cors
app.use(express.json()); //app should read json data from requests

// TEST ROUTE
//basically handles the get request and response of the homepage
app.get("/", (req, res) => {
  res.send("Backend is running");
});

//CONNECTING SERVER TO AUTH.JS
const authRoutes = require("./routes/auth");
app.use("/api", authRoutes);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});