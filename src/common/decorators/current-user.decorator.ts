import { RequestUser } from '@/auth/strategies/jwt.strategy';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();
    return req.user;
  },
);
