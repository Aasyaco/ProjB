import axios from "axios";

export async function fetchText(url: string): Promise<string> {
  const res = await axios.get(url, { timeout: 2000, responseType: "text" });
  return res.data.trim();
}
