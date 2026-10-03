import * as crypto from 'crypto';

export class PasswordHasher {
  /**
   * Hashes a password using scrypt with a unique salt.
   */
  static hash(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a plain password against the stored salt:hash string.
   */
  static verify(password: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) {
      return false;
    }
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      return false;
    }
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const keyBuf = Buffer.from(key, 'hex');
    const hashBuf = Buffer.from(hash, 'hex');
    if (keyBuf.length !== hashBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyBuf, hashBuf);
  }

  /**
   * Generates a secure random token or temporary password.
   */
  static generateRandomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
