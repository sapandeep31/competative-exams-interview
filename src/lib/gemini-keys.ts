/**
 * Utility to manage and retrieve Gemini API keys in a number-agnostic manner.
 *
 * Supports:
 * 1. Comma/newline-separated list via GEMINI_API_KEYS
 * 2. Numbered keys via GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...
 * 3. Default single key via GEMINI_API_KEY
 *
 * Randomly picks from available keys for load distribution and quota management.
 */

export function getAllGeminiApiKeys(): string[] {
  const keysSet = new Set<string>();

  // 1. Check GEMINI_API_KEYS (comma or newline separated)
  const envKeys = process.env.GEMINI_API_KEYS;
  if (envKeys) {
    envKeys
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean)
      .forEach((k) => keysSet.add(k));
  }

  // 2. Check standard GEMINI_API_KEY
  const defaultKey = process.env.GEMINI_API_KEY?.trim();
  if (defaultKey) {
    keysSet.add(defaultKey);
  }

  // 3. Check any GEMINI_API_KEY_* (e.g., GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
  for (const [key, value] of Object.entries(process.env)) {
    if (/^GEMINI_API_KEY_\w+$/i.test(key) && value) {
      const trimmed = value.trim();
      if (trimmed) {
        keysSet.add(trimmed);
      }
    }
  }

  return Array.from(keysSet);
}

/**
 * Returns a Gemini API key.
 * If userKey is provided, returns that userKey.
 * Otherwise, picks a random API key from all configured environment keys.
 */
export function getRandomGeminiApiKey(userKey?: string): string | undefined {
  const explicit = userKey?.trim();
  if (explicit) {
    return explicit;
  }

  const allKeys = getAllGeminiApiKeys();
  if (allKeys.length === 0) {
    return undefined;
  }

  const randomIndex = Math.floor(Math.random() * allKeys.length);
  return allKeys[randomIndex];
}
