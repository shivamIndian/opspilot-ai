import { hash, verify, Algorithm } from '@node-rs/argon2';

/**
 * Service managing cryptographic password hashing and verification using Argon2id.
 * Parameters align strictly with OWASP password storage recommendations.
 */
export class PasswordService {
  // OWASP Recommended Minimums: m=19456 (19 MB), t=2, p=1
  private readonly memoryCost = 19456;
  private readonly timeCost = 2;
  private readonly parallelism = 1;

  /**
   * Hashes a plaintext password using Argon2id with an automatically generated cryptographically secure salt.
   */
  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      outputLen: 32,
      parallelism: this.parallelism,
    });
  }

  /**
   * Verifies a plaintext password against an Argon2id hash.
   * Constant-time comparison executed inside native binding.
   */
  async verifyPassword(passwordHash: string, candidate: string): Promise<boolean> {
    try {
      return await verify(passwordHash, candidate);
    } catch {
      // In case of malformed hash format, reject safely
      return false;
    }
  }
}

export const passwordService = new PasswordService();
