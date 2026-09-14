import crypto from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(
  password: string,
  salt: string,
  options?: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, options ?? {}, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = await deriveKey(password, salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAX_MEMORY,
  });

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    if (storedHash.startsWith("scrypt$")) {
      const [algorithm, n, r, p, salt, encodedHash] = storedHash.split("$");
      if (algorithm !== "scrypt" || !n || !r || !p || !salt || !encodedHash) return false;

      const expected = Buffer.from(encodedHash, "base64url");
      if (expected.length !== KEY_LENGTH) return false;

      const computed = await deriveKey(password, salt, {
        N: Number(n),
        r: Number(r),
        p: Number(p),
        maxmem: SCRYPT_MAX_MEMORY,
      });
      return crypto.timingSafeEqual(expected, computed);
    }

    // Backwards compatibility for hashes created by the original implementation.
    const [salt, encodedHash] = storedHash.split(":");
    if (!salt || !encodedHash) return false;
    const expected = Buffer.from(encodedHash, "hex");
    if (expected.length !== KEY_LENGTH) return false;
    const computed = await deriveKey(password, salt);
    return crypto.timingSafeEqual(expected, computed);
  } catch {
    return false;
  }
}

export function passwordNeedsRehash(storedHash: string): boolean {
  return !storedHash.startsWith(`scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$`);
}
