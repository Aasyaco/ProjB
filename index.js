const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 64,
  timeout: 2000,
  rejectUnauthorized: true,
});

const fetchText = async (url) => {
  const { data } = await axios.get(url, {
    httpsAgent,
    responseType: "text",
    timeout: 2000,
    transformResponse: [(d) => d.trim()],
  });
  return data;
};

module.exports = async (req, res) => {
  if (!req.url.startsWith("/api")) return res.status(404).send("Not Found");

  const { key } = req.query;
  if (!key) return res.status(400).json({ status: "ERROR", message: "API key is required." });

  try {
    const primary = await fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch1.txt");

    if (primary === "ON") return handleSecondary(res, key);
    if (primary === "OFF") return res.status(503).json({ status: "MAINTENANCE", message: "Service is temporarily unavailable." });

    return res.status(500).json({ status: "ERROR", message: "Invalid primary response." });
  } catch (e) {
    return res.status(500).json({ status: "ERROR", message: "Primary fetch failed.", error: e.message });
  }
};

async function handleSecondary(res, key) {
  try {
    const status = await fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch2.txt");

    if (status === "START") return res.json({ status: "ACTIVE", message: "Service is running." });
    if (status === "CHK") return validateKey(res, key);

    return res.status(500).json({ status: "ERROR", message: "Invalid secondary status." });
  } catch (e) {
    return res.status(500).json({ status: "ERROR", message: "Secondary fetch failed.", error: e.message });
  }
}

async function validateKey(res, key) {
  try {
    const [block, subs] = await Promise.all([
      fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/bchk.txt"),
      fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch3.txt"),
    ]);

    const blockList = block.split("\n").map((k) => k.trim());
    if (blockList.find((k) => k === key)) return res.status(403).json({ status: "BLOCKED", message: "Access denied." });

    const userLine = subs
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.split("|")[0] === key);

    if (!userLine) return res.status(401).json({ status: "NONE", message: "API key not found." });

    const [userKey, deviceId, expiry, username] = userLine.split("|").map((v) => v.trim());

    if (!validDate(expiry)) return res.status(400).json({ status: "ERROR", message: "Invalid expiry date." });
    if (blockList.find((k) => k === userKey)) return res.status(403).json({ status: "BLOCKED", message: "Access denied." });

    const active = !expired(parseDate(expiry));
    return res.json({
      status: active ? "ACTIVE" : "EXPIRED",
      user: username,
      device: deviceId,
      expires: expiry
    });
  } catch (e) {
    return res.status(500).json({ status: "ERROR", message: "Key validation failed.", error: e.message });
  }
}

const validDate = (d) => {
  const [day, month, year] = d.split("-");
  const date = new Date(`${year}-${month}-${day}`);
  return !isNaN(date.getTime());
};

const parseDate = (d) => {
  const [day, month, year] = d.split("-");
  return new Date(`${year}-${month}-${day}`);
};

const expired = (d) => new Date() > d;
                                                                 
