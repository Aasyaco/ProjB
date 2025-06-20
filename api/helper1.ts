type UserInfo = {
  status: string;
  user: string;
  device: string;
  expires: string;
  ip_bound?: string | null;
};

function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.replace(/-/g, "");
  if (!/^\d{8}$/.test(cleaned)) return null;
  const day = parseInt(cleaned.slice(0, 2), 10);
  const month = parseInt(cleaned.slice(2, 4), 10) - 1;
  const year = parseInt(cleaned.slice(4, 8), 10);
  return new Date(year, month, day);
}

export function validateUser(
  key: string | number | boolean | null | undefined,
  subs_raw: string,
  block_raw: string,
  req_ip: string,
  user_agent: string
): UserInfo {
  // Handle null or undefined keys directly
  if (key === null || key === undefined) {
    console.log("[validateUser] key is null or undefined");
    return {
      status: "NONE",
      user: "",
      device: "",
      expires: "",
      ip_bound: null,
    };
  }

  const normalizedKey = String(key).trim().toLowerCase();
  console.log("[validateUser] normalizedKey:", normalizedKey);

  const blockSet = new Set(
    block_raw
      .split("\n")
      .map(l => l.trim().toLowerCase())
      .filter(Boolean)
  );
  console.log("[validateUser] blockSet:", blockSet);

  if (blockSet.has(normalizedKey)) {
    console.log("[validateUser] Key is blocked (in blockSet)");
    return {
      status: "BLOCKED",
      user: "",
      device: "",
      expires: "",
      ip_bound: null,
    };
  }

  let user_data_line: string | null = null;

  for (const line of subs_raw.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    if (trimmedLine.toLowerCase().startsWith(`${normalizedKey}|`)) {
      user_data_line = trimmedLine;
      break;
    }
  }
  console.log("[validateUser] user_data_line:", user_data_line);

  if (!user_data_line) {
    console.log("[validateUser] No user_data_line found");
    return {
      status: "NONE",
      user: "",
      device: "",
      expires: "",
      ip_bound: null,
    };
  }

  const parts = user_data_line.split("|").map(s => s.trim());
  console.log("[validateUser] parts:", parts);

  if (parts.length < 4) {
    console.log("[validateUser] parts length <", parts.length);
    return {
      status: "NONE",
      user: "",
      device: "",
      expires: "",
      ip_bound: null,
    };
  }

  const expiry_raw = parts[2];
  const expiryDate = parseDate(expiry_raw);
  const now = new Date();
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  console.log("[validateUser] expiry_raw:", expiry_raw, "expiryDate:", expiryDate, "nowDate:", nowDate);

  if (!expiryDate || nowDate > expiryDate) {
    console.log("[validateUser] EXPIRED", {expiryDate, nowDate});
    return {
      status: "EXPIRED",
      user: parts[3],
      device: parts[1],
      expires: expiry_raw,
      ip_bound: null,
    };
  }

  const ip_bound = parts.length >= 5 ? parts[4] : null;
  console.log("[validateUser] ip_bound:", ip_bound, "req_ip:", req_ip);

  if (ip_bound && ip_bound !== "" && ip_bound !== req_ip) {
    console.log("[validateUser] IP address mismatch, blocking user");
    return {
      status: "BLOCKED",
      user: parts[3],
      device: parts[1],
      expires: expiry_raw,
      ip_bound,
    };
  }

  console.log("[validateUser] User is ACTIVE", {
    user: parts[3],
    device: parts[1],
    expires: expiry_raw,
    ip_bound,
  });
  return {
    status: "ACTIVE",
    user: parts[3],
    device: parts[1],
    expires: expiry_raw,
    ip_bound,
  };
      }
