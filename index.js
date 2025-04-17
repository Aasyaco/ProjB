const serverless = require("serverless-http");
const app = require("api/index");

module.exports = serverless(app);
