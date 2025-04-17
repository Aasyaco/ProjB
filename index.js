const serverless = require("serverless-http");
const express = require("express");
const apiRoutes = require("./api/index.js");

const app = express();
const PORT = process.env.PORT || 8080;

// Use API routes
app.use("/api", apiRoutes);

// Start the server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
