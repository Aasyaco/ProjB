import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { ParsedQs } from "qs";

import { isBlocked } from "./helper2";
import { validateUser } from "./helper1";
import { ApiResponse } from "./types";
import { fetchText } from "./utils";

// Global rate limiter (per IP)
const globalLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

// Per-key rate limiter
const keyLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

// Helper to extract key as string or undefined
function extractKey(
  key: string | ParsedQs | string[] | ParsedQs[] | undefined
): string | undefined {
  if (typeof key === "string") return key;
  if (Array.isArray(key) && key.length > 0) {
    if (typeof key[0] === "string") return key[0];
  }
  return undefined;
}

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

    // Get API key from query
    const key = extractKey(req.query.key);

    if (!key) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "API key required" });
    }

    // Rate limiting by IP and key
    try {
      await globalLimiter.consume(req.ip);
      await keyLimiter.consume(key);
    } catch {
      return res
        .status(429)
        .json({ status: "ERROR", message: "Too many requests" });
    }

    // Fetch system state
    const primary = await fetchText(
      "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch1.txt"
    );
    if (primary === "OFF")
      return res.status(503).json({ status: "MAINTENANCE" });
    if (primary !== "ON")
      return res
        .status(500)
        .json({ status: "ERROR", message: "Invalid system state" });

    // Fetch API status
    const status = await fetchText(
      "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch2.txt"
    );
    if (status === "START") return res.json({ status: "ACTIVE" });
    if (status !== "CHK")
      return res
        .status(500)
        .json({ status: "ERROR", message: "Invalid status" });

    // Fetch blocklist and subscriptions
    const [blockRaw, subsRaw] = await Promise.all([
      fetchText(
        "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/bchk.txt"
      ),
      fetchText(
        "https://cdn.jsdelivr.net/gh/George-Codr/Database@main/ch3.txt"
      ),
    ]);

    // Check blocklist
    if (isBlocked(key, blockRaw)) {
      return res
        .status(403)
        .json({ status: "BLOCKED", message: "Key blocked" });
    }

    // Validate user
    const userInfo = validateUser(
      key,
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
