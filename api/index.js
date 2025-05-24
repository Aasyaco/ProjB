import axios from "axios";

const fetchText = async (url) =>
  axios.get(url, {
    timeout: 2000,
    responseType: "text",
    transformResponse: [(d) => d.trim()],
  }).then(res => res.data);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const key = req.query.key;
  if (!key) return res.status(400).json({ status: "ERROR", message: "API key is required." });

  try {
    const primaryPromise = fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch1.txt");
    const primary = await timeoutPromise(primaryPromise, 2500);
    if (primary === "ON") return handleSecondary(res, key);
    if (primary === "OFF") return res.status(503).json({ status: "MAINTENANCE", message: "Service is temporarily unavailable." });
    return res.status(500).json({ status: "ERROR", message: "Invalid primary response." });
  } catch (e) {
    return res.status(500).json({ status: "ERROR", message: "Primary fetch failed.", error: e.message });
  }
}

async function handleSecondary(res, key) {
  try {
    const statusPromise = fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch2.txt");
    const status = await timeoutPromise(statusPromise, 2000);
    if (status === "START") return res.json({ status: "ACTIVE", message: "Service is running." });
    if (status === "CHK") return validateKey(res, key);
    return res.status(500).json({ status: "ERROR", message: "Invalid secondary status." });
  } catch (e) {
    return res.status(500).json({ status: "ERROR", message: "Secondary fetch failed.", error: e.message });
  }
}

async function validateKey(res, key) {
  try {
    const [blockRaw, subsRaw] = await Promise.all([
      fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/bchk.txt"),
      fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch3.txt")
    ]);

    const blockList = new Set(blockRaw.split("\n").map(line => line.trim()));
    if (blockList.has(key)) return res.status(403).json({ status: "BLOCKED", message: "Access denied." });

    const userLine = subsRaw.split("\n").map(line => line.trim()).find(line => line.startsWith(key + "|"));
    if (!userLine) return res.status(401).json({ status: "NONE", message: "API key not found." });

    const [userKey, deviceId, expiry, username] = userLine.split("|").map(x => x.trim());
    if (!isValidDate(expiry)) return res.status(400).json({ status: "ERROR", message: "Invalid expiry date." });

    if (blockList.has(userKey)) return res.status(403).json({ status: "BLOCKED", message: "Access denied." });

    const active = new Date() <= parseDate(expiry);
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

const isValidDate = (d) => {
  const [day, month, year] = d.split("-");
  const date = new Date(`${year}-${month}-${day}`);
  return !isNaN(date.getTime());
};

const parseDate = (d) => {
  const [day, month, year] = d.split("-");
  return new Date(`${year}-${month}-${day}`);
};

const timeoutPromise = (promise, ms) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout")), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};
      
