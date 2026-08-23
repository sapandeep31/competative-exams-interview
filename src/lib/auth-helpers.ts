import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { auth } from './auth';
import { db } from './db';
import { userProfiles } from './schema';
import { decryptApiKey } from './crypto';
import { getRandomGeminiApiKey } from './gemini-keys';

/**
 * Retrieves the authenticated user from the current request headers.
 * Returns null if no valid session exists.
 */
export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Retrieves and decrypts the user's stored Gemini API key.
 * Falls back to server-side env keys if none is stored.
 */
export async function getUserApiKey(userId: string): Promise<string | undefined> {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  if (profile?.geminiApiKeyEncrypted) {
    try {
      return decryptApiKey(profile.geminiApiKeyEncrypted);
    } catch {
      // If decryption fails, fall back to env keys
      console.error('[Auth] Failed to decrypt API key for user:', userId);
    }
  }

  // Fall back to server-configured keys
  return getRandomGeminiApiKey();
}
