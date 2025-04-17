const serverless = require("serverless-http");
const express = require("express");
const apiRoutes = require("./api/index.js");

const app = express();

// Use API routes
app.use("/api", apiRoutes);

// Export the serverless handler for deployment
module.exports.handler = serverless(app);
