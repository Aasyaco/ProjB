import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "rate-limiter-flexible";
// Use CommonJS require for native modules
const { isBlocked } = require("../api/helper2.ts");
const { validateUser } = require("../api/helper1.ts");

// TypeScript-compatible imports for other modules
import { ApiResponse } from "./types";
import { fetchText } from "./utils";

// Global rate limiter (per IP)
const globalLimiter = new rateLimit.RateLimiterMemory({
  points: 100, // max 100 requests
  duration: 60, // per minute
});

// Per-key rate limiter
const keyLimiter = new rateLimit.RateLimiterMemory({
  points: 10, // max 10 requests per key per minute
  duration: 60,
});

// Exported handler for Express or serverless environments
export default async function handler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader("Cache-Control", "no-store");

  try {
    // Enforce HTTPS in production
    if (req.protocol !== "https" && process.env.NODE_ENV === "production") {
      return res.status(403).json({ status: "ERROR", message: "HTTPS required" });
    }

    // Ensure `key` is a string
    const key = typeof req.query.key === "string" ? req.query.key : undefined;
    if (!key) {
      return res.status(400).json({ status: "ERROR", message: "API key required" });
    }

    // Rate limiting by IP
    await globalLimiter.consume(req.ip);

    // Rate limiting by API key
    await keyLimiter.consume(key);

    // Fetch system state
    const primary = await fetchText(
      "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch1.txt"
    );
    if (primary === "OFF")
      return res.status(503).json({ status: "MAINTENANCE" });
    if (primary !== "ON")
      return res.status(500).json({ status: "ERROR", message: "Invalid system state" });

    // Fetch API status
    const status = await fetchText(
      "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch2.txt"
    );
    if (status === "START") return res.json({ status: "ACTIVE" });
    if (status !== "CHK")
      return res.status(500).json({ status: "ERROR", message: "Invalid status" });

    // Fetch blocklist and subscriptions
    const [blockRaw, subsRaw] = await Promise.all([
      fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/bchk.txt"),
      fetchText("https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch3.txt"),
    ]);

    // Use C++ addon for blocklist check
    if (isBlocked(key, blockRaw)) {
      return res.status(403).json({ status: "BLOCKED", message: "Key blocked" });
    }

    // Rust addon validates user, expiry, device, and IP binding
    const userInfo: ApiResponse = validateUser(
      key,
      subsRaw,
      blockRaw,
      req.ip,
      String(req.headers["user-agent"] || "")
    );

    if (userInfo.status === "EXPIRED") {
      return res.status(403).json({ status: "EXPIRED", message: "API key expired" });
    }

    if (userInfo.status === "BLOCKED") {
      return res.status(403).json({ status: "BLOCKED", message: "API key blocked" });
    }

    return res.json(userInfo);
  } catch (err) {
    // Log and forward error to Express error middleware if present
    console.error("API error:", err);
    if (typeof next === "function") return next(err);
    return res.status(500).json({ status: "ERROR", message: "Internal server error" });
  }
}
