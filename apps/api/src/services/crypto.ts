import crypto from 'crypto';

// Derives a secure 32-byte key from DB_ENCRYPTION_KEY or falls back to a development secret key
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY
  ? crypto.scryptSync(process.env.DB_ENCRYPTION_KEY, 'salt', 32)
  : Buffer.from('v3ry_s3cr3t_d3v_3ncrypt10n_k3y32', 'utf-8'); // must be exactly 32 bytes

const IV_LENGTH = 16; // AES standard Initialization Vector length

// A fixed, deterministic IV for searching unique fields like emails
const DETERMINISTIC_IV = crypto.scryptSync(
  process.env.DB_ENCRYPTION_KEY || 'default-sustain-key-salt',
  'email-deterministic-iv-salt',
  IV_LENGTH
);

/**
 * Encrypts a field (e.g., name) non-deterministically using a random Initialization Vector (IV).
 * Good for values that do not need to be searched for exact matches.
 */
export function encryptName(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts a non-deterministically encrypted field.
 */
export function decryptName(text: string): string {
  if (!text || !text.includes(':') || text.startsWith('det:')) {
    return text;
  }
  try {
    const [ivHex, encryptedHex] = text.split(':');
    if (ivHex.length !== 32) return text; // safety check
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText).toString('utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // If decryption fails, return original text as fallback (backwards compatibility)
    return text;
  }
}

/**
 * Encrypts a unique search-indexed field (e.g., email) deterministically using a fixed IV.
 * Ensures the same text always encrypts to the same ciphertext, making DB lookups possible.
 */
export function encryptDeterministic(text: string): string {
  if (!text) return text;
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, DETERMINISTIC_IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return 'det:' + encrypted;
}

/**
 * Decrypts a deterministically encrypted field.
 */
export function decryptDeterministic(text: string): string {
  if (!text || !text.startsWith('det:')) {
    return text;
  }
  try {
    const encryptedHex = text.substring(4);
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, DETERMINISTIC_IV);
    let decrypted = decipher.update(encryptedText).toString('utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return text;
  }
}

/**
 * Transparent utility to decrypt user fields, checking which encryption style was used.
 */
export function decryptUserField(text: string | null | undefined): string {
  if (!text) return '';
  if (text.startsWith('det:')) {
    return decryptDeterministic(text);
  }
  return decryptName(text);
}
