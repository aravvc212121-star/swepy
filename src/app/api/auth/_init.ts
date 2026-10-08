import { AuthRepository } from '@/server/repositories/auth.repository';
import { AuthService } from '@/server/services/auth.service';
import type { OtpSender } from '@/server/lib/interfaces';

class ConsoleOtpSender implements OtpSender {
  async send(phone: string, otp: string): Promise<void> {
    console.log(`[OTP] Sending ${otp} to ${phone}`);
  }
}

export const authService = new AuthService(new AuthRepository(), new ConsoleOtpSender());
