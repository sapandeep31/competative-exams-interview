import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = 'competitive-exams-interview-salt';

/**
 * Derives a 256-bit encryption key from BETTER_AUTH_SECRET via PBKDF2.
 */
function deriveKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not set — cannot encrypt/decrypt API keys.');
  }
  return pbkdf2Sync(secret, SALT, 100_000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a plaintext API key using AES-256-GCM.
 * Returns a base64 string in format: iv:authTag:ciphertext
 */
export function encryptApiKey(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts an API key encrypted with encryptApiKey().
 * Expects the base64 string format: iv:authTag:ciphertext
 */
export function decryptApiKey(encrypted: string): string {
  const key = deriveKey();
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(':');

  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Invalid encrypted API key format.');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
