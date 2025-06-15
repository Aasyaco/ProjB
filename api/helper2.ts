/**
 * Checks if a given key is present in a newline-separated block list string.
 * @param key - The string key to check for.
 * @param blockRaw - The block list as a newline-separated string.
 * @returns True if the key is blocked, false otherwise.
 */
export function isBlocked(key: string, blockRaw: string): boolean {
  if (!key || typeof blockRaw !== 'string') return false;
  // Use a Set for efficient O(1) lookups, trimming whitespace and ignoring empty lines
  const blockSet = new Set(
    blockRaw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  );
  return blockSet.has(key);
}
