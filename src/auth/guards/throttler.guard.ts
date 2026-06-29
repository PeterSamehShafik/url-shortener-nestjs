import { RequestUser } from '@/auth/strategies/jwt.strategy';
import { Injectable } from '@nestjs/common';
import {
  hours,
  minutes,
  ThrottlerGuard,
  ThrottlerRequest,
} from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    if (req.user?.userId) {
      return Promise.resolve(`throttler:user:${req.user.userId}`);
    }
    return Promise.resolve(
      `throttler:ip:${req.headers['x-forwarded-for'] || req.ip}`,
    );
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, throttler } = requestProps;
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();

    const isAuthenticated = !!req.user?.userId;
    const isCreateUrl = req.method === 'POST' && req.url.startsWith('/urls');

    let dynamicLimit = requestProps.limit;
    let dynamicBlockDuration = requestProps.blockDuration;
    let dynamicTTl = requestProps.ttl;

    if (isCreateUrl) {
      if (throttler.name === 'short') {
        dynamicTTl = minutes(1);
        dynamicLimit = isAuthenticated ? 20 : 3;
        dynamicBlockDuration = isAuthenticated ? minutes(1) : minutes(5);
      } else if (throttler.name === 'medium') {
        dynamicTTl = isAuthenticated ? minutes(15) : hours(1);
        dynamicLimit = isAuthenticated ? 100 : 20;
        dynamicBlockDuration = isAuthenticated ? minutes(15) : hours(1);
      } else if (throttler.name === 'long') {
        dynamicTTl = hours(24);
        dynamicLimit = isAuthenticated ? 500 : 50;
        dynamicBlockDuration = isAuthenticated ? hours(2) : hours(24);
      }
    }

    return super.handleRequest({
      ...requestProps,
      limit: dynamicLimit,
      blockDuration: dynamicBlockDuration,
      ttl: dynamicTTl,
    });
  }
}
