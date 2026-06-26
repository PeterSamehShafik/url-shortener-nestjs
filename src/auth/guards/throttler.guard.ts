import { ThrottlerGuard } from '@nestjs/throttler';

export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    if (req.user && req.user.userId) {
      return Promise.resolve(`throttler:user:${req.user.userId}`);
    }
    return Promise.resolve(
      `throttler:ip:${req.ip || req.headers['x-forwarded-for']}`,
    );
  }
}
