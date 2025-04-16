const express = require("express");
const axios = require("axios");
const https = require("https");
const serverless = require("serverless-http");

const app = express();
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: true });

const fetchText = async (url) => {
  const res = await axios.get(url, { httpsAgent, responseType: "text", timeout: 3000 });
  return res.data.trim();
};

app.get("/", async (req, res) => {
  const key = req.query.key?.trim();
  if (!key) return res.status(400).json({ status: "ERROR", message: "API key is required." });
  try {
    const primary = await fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch1.txt");
    if (primary === "ON") return handleSecondary(res, key);
    if (primary === "OFF") return res.status(503).json({ status: "MAINTENANCE", message: "Service is temporarily unavailable." });
    return res.status(500).json({ status: "ERROR", message: "Invalid primary response." });
  } catch (e) {
    return res.status(500).json({ status: "ERROR", message: "Unexpected error.", error: e.message });
  }
});

async function handleSecondary(res, key) {
  const status = await fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch2.txt");
  if (status === "START") return res.json({ status: "ACTIVE", message: "Service is running." });
  if (status === "CHK") return validateKey(res, key);
  return res.status(500).json({ status: "ERROR", message: "Invalid secondary status." });
}

async function validateKey(res, key) {
  const [block, subs] = await Promise.all([
    fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/bchk.txt"),
    fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch3.txt")
  ]);
  const blockList = block.split("\n").map(k => k.trim());
  if (blockList.includes(key)) return res.status(403).json({ status: "BLOCKED", message: "Access denied." });
  const userLine = subs.split("\n").map(l => l.trim()).find(l => l.split("|")[0] === key);
  if (!userLine) return res.status(401).json({ status: "NONE", message: "API key not found." });
  const [userKey, deviceId, expiry, username] = userLine.split("|");
  if (!validDate(expiry)) return res.status(400).json({ status: "ERROR", message: "Invalid expiry date." });
  if (blockList.includes(userKey)) return res.status(403).json({ status: "BLOCKED", message: "Access denied." });
  const active = !expired(parseDate(expiry));
  return res.json({ status: active ? "ACTIVE" : "EXPIRED", user: username, device: deviceId, expires: expiry });
}

const validDate = (d) => { const [a, b, c] = d.split("-"); const t = new Date(`${c}-${b}-${a}`); return !isNaN(t.getTime()); };
const parseDate = (d) => { const [a, b, c] = d.split("-"); return new Date(`${c}-${b}-${a}`); };
const expired = (e) => new Date() > e;

module.exports = serverless(app);
  
