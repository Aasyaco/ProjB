const express = require("express");
const axios = require("axios");
const https = require("https");
const serverless = require("serverless-http");

const app = express();
const httpsAgent = new https.Agent({ rejectUnauthorized: true });

// Utility to fetch text data from a URL
const fetchText = async (url) => {
  const response = await axios.get(url, { httpsAgent });
  return response.data.trim();
};

app.get("/", async (req, res) => {
  const key = req.query.key?.trim();

  if (!key) {
    return res.status(400).json({ status: "ERROR", message: "API key is required." });
  }

  try {
    const primaryStatus = await fetchText("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/ch1.txt");

    if (primaryStatus.includes("ON")) {
      await handleSecondaryStatus(res, key);
    } else if (primaryStatus.includes("OFF")) {
      res.status(503).json({ status: "MAINTENANCE", message: "Service is temporarily unavailable." });
    } else {
      res.status(500).json({ status: "ERROR", message: "Invalid primary server response." });
    }
  } catch (error) {
    res.status(500).json({ status: "ERROR", message: "Unexpected error.", error: error.message });
  }
});

async function handleSecondaryStatus(res, key) {
  const status = await fetchText("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/ch2.txt");

  if (status.includes("START")) {
    res.json({ status: "ACTIVE", message: "Service is running." });
  } else if (status.includes("CHK")) {
    await validateUserKey(res, key);
  } else {
    res.status(500).json({ status: "ERROR", message: "Invalid secondary status." });
  }
}

async function validateUserKey(res, key) {
  const blockList = await fetchText("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/bchk.txt");

  if (blockList.includes(key)) {
    return res.status(403).json({ status: "BLOCKED", message: "Access denied." });
  }

  const subscriptionData = await fetchText("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/ch3.txt");
  const userLine = subscriptionData.split("\n").find(line => line.includes(key));

  if (!userLine) {
    return res.status(401).json({ status: "NONE", message: "API key not found." });
  }

  const [userKey, deviceId, expiry, username] = userLine.split("|");

  if (!isValidDate(expiry)) {
    return res.status(400).json({ status: "ERROR", message: "Invalid expiry date format." });
  }

  if (blockList.includes(userKey)) {
    return res.status(403).json({ status: "BLOCKED", message: "Access denied." });
  }

  const isActive = !isExpired(parseDate(expiry));
  res.json({
    status: isActive ? "ACTIVE" : "EXPIRED",
    user: username,
    device: deviceId,
    expires: expiry
  });
}

function isValidDate(dateStr) {
  const [d, m, y] = dateStr.split("-");
  const date = new Date(`${y}-${m}-${d}`);
  return date instanceof Date && !isNaN(date);
}

function parseDate(dateStr) {
  const [d, m, y] = dateStr.split("-");
  return new Date(`${y}-${m}-${d}`);
}

function isExpired(expiryDate) {
  return new Date() > expiryDate;
}

module.exports = serverless(app);
