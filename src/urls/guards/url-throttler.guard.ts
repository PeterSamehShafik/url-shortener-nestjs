import { RequestUser } from '@/auth/strategies/jwt.strategy';
import { Injectable } from '@nestjs/common';
import {
  hours,
  minutes,
  ThrottlerGuard,
  ThrottlerRequest,
} from '@nestjs/throttler';

@Injectable()
export class UrlThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    if (req.user && req.user.userId) {
      return Promise.resolve(`throttler:url:user:${req.user.userId}`);
    }
    return Promise.resolve(
      `throttler:url:ip:${req.headers['x-forwarded-for'] || req.ip}`,
    );
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, throttler } = requestProps;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();
    const isClientAuthenticated = !!(req.user && req.user.userId);

    let dynamicLimit = requestProps.limit;
    let dynamicBlockDuration = requestProps.blockDuration;

    if (throttler.name === 'short') {
      dynamicLimit = isClientAuthenticated ? 20 : 3;
      dynamicBlockDuration = isClientAuthenticated ? minutes(1) : minutes(5);
    } else if (throttler.name === 'medium') {
      dynamicLimit = isClientAuthenticated ? 100 : 20;
      dynamicBlockDuration = isClientAuthenticated ? minutes(15) : hours(1);
    } else if (throttler.name === 'long') {
      dynamicLimit = isClientAuthenticated ? 500 : 50;
      dynamicBlockDuration = isClientAuthenticated ? hours(2) : hours(24);
    }

    return super.handleRequest({
      ...requestProps,
      limit: dynamicLimit,
      blockDuration: dynamicBlockDuration,
    });
  }
}
