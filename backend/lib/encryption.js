/**
 * Application-level field encryption for sensitive data at rest (REQ 16).
 *
 * Uses AES-256-GCM (authenticated encryption). The 32-byte key is derived
 * from FIELD_ENCRYPTION_KEY via SHA-256, so any passphrase length works.
 *
 * Encrypted values are stored as a self-describing string:
 *   enc:v1:<iv-b64>:<authTag-b64>:<ciphertext-b64>
 * The "enc:v1:" prefix lets decrypt()/isEncrypted() recognise our own
 * ciphertext and leave any pre-existing plaintext untouched (graceful
 * migration — old rows keep working until they are next saved).
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';
const IV_BYTES = 12; // GCM standard nonce length

let cachedKey = null;

function getKey() {
  if (cachedKey) return cachedKey;
  const secret = process.env.FIELD_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('FIELD_ENCRYPTION_KEY is not configured');
  }
  cachedKey = crypto.createHash('sha256').update(String(secret)).digest();
  return cachedKey;
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return plaintext;
  }
  const text = String(plaintext);
  if (isEncrypted(text)) return text; // already encrypted — don't double-encrypt

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    PREFIX + iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

function decrypt(value) {
  if (!isEncrypted(value)) return value; // plaintext or non-string — return as-is

  try {
    const withoutPrefix = value.slice(PREFIX.length);
    const [ivB64, tagB64, dataB64] = withoutPrefix.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(dataB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    // Tampered or undecryptable — fail closed by hiding the value.
    return '';
  }
}

/**
 * Mongoose plugin: transparently encrypt the given string paths at rest and
 * decrypt them back in memory. Supports dot paths for nested sub-documents.
 *
 * - pre('save')   : encrypt modified paths before they hit the DB.
 * - post('save')  : decrypt back so the in-memory doc stays usable.
 * - post('init')  : decrypt documents loaded from the DB.
 *
 * NOTE: relies on save() — query updates (findOneAndUpdate) bypass it, so
 * callers that change these fields must load + save the document instead.
 */
function encryptedFields(schema, paths) {
  function forEachValue(doc, fn) {
    for (const path of paths) {
      const current = doc.get(path);
      if (typeof current === 'string' && current !== '') {
        const next = fn(current);
        if (next !== current) doc.set(path, next);
      }
    }
  }

  schema.pre('save', function () {
    forEachValue(this, encrypt);
  });

  schema.post('save', function () {
    forEachValue(this, decrypt);
  });

  schema.post('init', function () {
    forEachValue(this, decrypt);
  });
}

module.exports = { encrypt, decrypt, isEncrypted, encryptedFields, PREFIX };
