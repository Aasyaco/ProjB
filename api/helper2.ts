/**
 * Checks if a given key is present in a newline-separated block list string.
 * @param key - The string key to check for.
 * @param blockRaw - The block list as a newline-separated string.
 * @returns True if the key is blocked, false otherwise.
 */
export function isBlocked(
  key: string | number | boolean | null | undefined,
  blockRaw: string
): boolean {
  if (key === undefined || key === null) return false;
  if (typeof blockRaw !== 'string' || !blockRaw.trim()) return false;

  const normalizedKey = String(key).trim().toLowerCase().normalize();

  const blockSet = new Set(
    blockRaw
      .split('\n')
      .map(line => line.trim().toLowerCase().normalize())
      .filter(Boolean)
  );

  return blockSet.has(normalizedKey);
}
