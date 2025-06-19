const express = require("express");
const path = require("path");
const handler = require("./handler").default;

const app = express();
app.set('trust proxy', 1); // Important for HTTPS detection in Vercel/proxy environments

const PORT = process.env.PORT || 3000;

// Serve static files if you have a public directory
app.use(express.static(path.join(__dirname, "../public")));

// Attach your handler to /api – GET only
app.get("/api", handler);

// Optional: Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// For Vercel/Serverless: do NOT call app.listen(), just export app:
module.exports = app;
