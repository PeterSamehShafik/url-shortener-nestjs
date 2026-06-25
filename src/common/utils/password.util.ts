import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class PasswordUtil {
  static async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hashBuffer = (await scryptAsync(password, salt, 32)) as Buffer;
    return `${salt}.${hashBuffer.toString('hex')}`;
  }

  static async verify(password: string, storedHash: string): Promise<boolean> {
    const [salt, originalHash] = storedHash.split('.');
    if (!salt || !originalHash) return false;

    const currentHashBuffer = (await scryptAsync(password, salt, 32)) as Buffer;
    const originalHashBuffer = Buffer.from(originalHash, 'hex');

    //for Timing Side-Channel Attacks
    return timingSafeEqual(currentHashBuffer, originalHashBuffer);
  }
}
