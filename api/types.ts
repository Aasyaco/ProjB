export interface ApiResponse {
  status: "ACTIVE" | "EXPIRED" | "BLOCKED" | "NONE" | "ERROR";
  message?: string;
  user?: string;
  device?: string;
  expires?: string;
  ip?: string;
  error?: string;
}
