import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

import { isBlocked } from "./helper2";
import { validateUser } from "./helper1";
import { ApiResponse } from "./types";
import { fetchText } from "./utils";

// Global rate limiter (per IP)
const globalLimiter = new RateLimiterMemory({
  points: 100, // max 100 requests per minute per IP
  duration: 60,
});

// Per-key rate limiter
const keyLimiter = new RateLimiterMemory({
  points: 10, // max 10 requests per key per minute
  duration: 60,
});

export default async function handler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader("Cache-Control", "no-store");

  try {
    // Enforce HTTPS in production
    if (
      req.protocol !== "https" &&
      (process.env.NODE_ENV || "").toLowerCase() === "production"
    ) {
      return res
        .status(403)
        .json({ status: "ERROR", message: "HTTPS required" });
    }

    // Extract API key or use fallback
    let rawKey = req.query.key;
    if (Array.isArray(rawKey)) rawKey = rawKey[0];

    let key = (typeof rawKey === "string" ? rawKey.trim() : "").toString();
    if (!key) {
      key = "demo-key"; // fallback value
    }

    const safeKey = key;

    // Apply rate limiting
    try {
      await globalLimiter.consume(req.ip);
      await keyLimiter.consume(safeKey);
    } catch {
      return res
        .status(429)
        .json({ status: "ERROR", message: "Too many requests" });
    }

    // Check system status
    const primary = await fetchText(
      "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch1.txt"
    );
    if (primary === "OFF")
      return res.status(503).json({ status: "MAINTENANCE" });
    if (primary !== "ON")
      return res
        .status(500)
        .json({ status: "ERROR", message: "Invalid system state" });

    // Check API status
    const status = await fetchText(
      "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch2.txt"
    );
    if (status === "START") return res.json({ status: "ACTIVE" });
    if (status !== "CHK")
      return res
        .status(500)
        .json({ status: "ERROR", message: "Invalid status" });

    // Load block and subscription data
    const [blockRaw, subsRaw] = await Promise.all([
      fetchText(
        "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/bchk.txt"
      ),
      fetchText(
        "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch3.txt"
      ),
    ]);

    // Check blocklist
    if (isBlocked(safeKey, blockRaw)) {
      return res
        .status(403)
        .json({ status: "BLOCKED", message: "Key blocked" });
    }

    // Validate user
    const userInfo = validateUser(
      safeKey,
      subsRaw,
      blockRaw,
      req.ip,
      String(req.headers["user-agent"] || "")
    ) as ApiResponse;

    if (userInfo.status === "EXPIRED") {
      return res
        .status(403)
        .json({ status: "EXPIRED", message: "API key expired" });
    }

    if (userInfo.status === "BLOCKED") {
      return res
        .status(403)
        .json({ status: "BLOCKED", message: "API key blocked" });
    }

    return res.json(userInfo);
  } catch (err) {
    console.error("API error:", err);
    if (typeof next === "function") return next(err);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
             }
      
