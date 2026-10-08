import { AuthRepository } from '../repositories/auth.repository';
import { generateOtp6, generateSessionToken } from '../lib/id';
import { hmacHash, sha256 } from '../lib/crypto';
import type { OtpSender } from '../lib/interfaces';

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly otpSender: OtpSender
  ) {}

  async requestOtp(phoneE164: string): Promise<void> {
    // 1. Check rate limits (omitted for brevity, handled by infra usually or separate DB table)
    
    // 2. Generate OTP
    let otp = generateOtp6();
    if (process.env.AUTH_DEV_OTP === 'true') {
      otp = '000000'; // Override for dev mode
    }

    // 3. Hash OTP
    const hash = hmacHash(otp);

    // 4. Save challenge (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.repo.createOtpChallenge(phoneE164, hash, expiresAt);

    // 5. Send OTP
    if (process.env.AUTH_DEV_OTP !== 'true') {
      await this.otpSender.send(phoneE164, otp);
    }
  }

  async verifyOtp(phoneE164: string, otp: string, role: string = 'customer'): Promise<{ token: string; user: any }> {
    const challenge = await this.repo.getLatestChallenge(phoneE164);
    if (!challenge) {
      throw new Error('No active OTP request found or expired');
    }

    if (challenge.attempts >= challenge.max_attempts) {
      throw new Error('Too many failed attempts');
    }

    const hash = hmacHash(otp);
    if (challenge.code_hash !== hash) {
      await this.repo.incrementChallengeAttempts(challenge.id);
      throw new Error('Invalid OTP');
    }

    // Success
    await this.repo.consumeChallenge(challenge.id);

    // Upsert User
    const user = await this.repo.upsertUserByPhone(phoneE164, role);

    // Create Session
    const token = generateSessionToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await this.repo.createSession(user.id, tokenHash, expiresAt);

    return { token, user };
  }

  async validateSession(token: string) {
    const tokenHash = sha256(token);
    const session = await this.repo.getSessionByTokenHash(tokenHash);
    if (!session) {
      throw new Error('Invalid or expired session');
    }
    return session.user;
  }

  async logout(token: string): Promise<void> {
    const tokenHash = sha256(token);
    await this.repo.revokeSession(tokenHash);
  }
}
