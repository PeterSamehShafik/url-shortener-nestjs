import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from '@/common/decorators/optional-auth.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isOptional) {
      // Run the guard but don't reject if it fails
      return this.canActivateOptional(context);
    }

    return super.canActivate(context);
  }

  private async canActivateOptional(
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // No token or invalid token — that's fine, req.user stays undefined
    }
    return true;
  }
}
