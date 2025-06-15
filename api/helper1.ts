type UserInfo = {
  status: string;
  user: string;
  device: string;
  expires: string;
  ip_bound?: string | null;
};

function parseDate(dateStr: string): Date | null {
  // Expects dd-mm-yyyy or ddmmyyyy
  const cleaned = dateStr.replace(/-/g, "");
  if (!/^\d{8}$/.test(cleaned)) return null;
  const day = parseInt(cleaned.slice(0, 2), 10);
  const month = parseInt(cleaned.slice(2, 4), 10) - 1; // Months are 0-based
  const year = parseInt(cleaned.slice(4, 8), 10);
  return new Date(year, month, day);
}

export function validateUser(
  key: string,
  subs_raw: string,
  block_raw: string,
  req_ip: string,
  user_agent: string
): UserInfo {
  const blockSet = new Set(block_raw.split("\n").map(l => l.trim()));
  if (blockSet.has(key)) {
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
    if (line.startsWith(`${key}|`)) {
      user_data_line = line;
      break;
    }
  }

  if (!user_data_line) {
    return {
      status: "NONE",
      user: "",
      device: "",
      expires: "",
      ip_bound: null,
    };
  }

  const parts = user_data_line
    .split("|")
    .map(s => s.trim());

  // Expected: key|device|expiry|user|ipbound(optional)
  if (parts.length < 4) {
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
  // Remove time part for date-only comparison
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!expiryDate || nowDate > expiryDate) {
    return {
      status: "EXPIRED",
      user: parts[3],
      device: parts[1],
      expires: expiry_raw,
      ip_bound: null,
    };
  }

  const ip_bound = parts.length >= 5 ? parts[4] : null;
  if (ip_bound && ip_bound !== "" && ip_bound !== req_ip) {
    return {
      status: "BLOCKED",
      user: parts[3],
      device: parts[1],
      expires: expiry_raw,
      ip_bound,
    };
  }

  return {
    status: "ACTIVE",
    user: parts[3],
    device: parts[1],
    expires: expiry_raw,
    ip_bound,
  };
}
