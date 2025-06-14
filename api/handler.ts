import express, { Request, Response } from "express";
import helmet from "helmet";
import rateLimit from "rate-limiter-flexible";
import axios from "axios";
// Use CommonJS require for native modules
const { isBlocked } = require("../native/cpp-addon/build/Release/addon.node");
const { validateUser } = require("../native/rust-validator/index.node");

// TypeScript-compatible imports for other modules
import { ApiResponse } from "./types";
import { fetchText } from "./utils";


const app = express();
app.use(helmet()); // Security headers

// Global rate limiter (per IP)
const globalLimiter = new rateLimit.RateLimiterMemory({
  points: 100, // max 100 requests
  duration: 60, // per minute
});

const keyLimiter = new rateLimit.RateLimiterMemory({
  points: 10, // max 10 requests per key per minute
  duration: 60,
});

app.get("/api", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");

  // Enforce HTTPS
  if (req.protocol !== "https" && process.env.NODE_ENV === "production") {
    return res.status(403).json({ status: "ERROR", message: "HTTPS required" });
  }

  const key = req.query.key as string | undefined;
  if (!key) return res.status(400).json({ status: "ERROR", message: "API key required" });

  try {
    // Rate limiting by IP
    await globalLimiter.consume(req.ip);

    // Rate limiting by API key
    await keyLimiter.consume(key);

  } catch {
    return res.status(429).json({ status: "ERROR", message: "Too many requests" });
  }

  try {
    const primary = await fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch1.txt");
    if (primary === "OFF") return res.status(503).json({ status: "MAINTENANCE" });
    if (primary !== "ON") return res.status(500).json({ status: "ERROR", message: "Invalid system state" });

    const status = await fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch2.txt");
    if (status === "START") return res.json({ status: "ACTIVE" });
    if (status !== "CHK") return res.status(500).json({ status: "ERROR", message: "Invalid status" });

    const [blockRaw, subsRaw] = await Promise.all([
      fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/bchk.txt"),
      fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch3.txt"),
    ]);

    // Use C++ addon for blocklist check
    if (isBlocked(key, blockRaw)) {
      return res.status(403).json({ status: "BLOCKED", message: "Key blocked" });
    }

    // Rust addon validates user, expiry, device, and IP binding
    const userInfo: ApiResponse = validateUser(key, subsRaw, blockRaw, req.ip, String(req.headers["user-agent"] || ""));

    if (userInfo.status === "EXPIRED") {
      return res.status(403).json({ status: "EXPIRED", message: "API key expired" });
    }

    if (userInfo.status === "BLOCKED") {
      return res.status(403).json({ status: "BLOCKED", message: "API key blocked" });
    }

    return res.json(userInfo);
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ status: "ERROR", message: "Internal server error" });
  }
});

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
                                               
