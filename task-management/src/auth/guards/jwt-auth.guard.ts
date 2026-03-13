import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Expects the API Gateway to have already validated the JWT and to forward
 * the authenticated user's identity as trusted HTTP headers:
 *   x-user-id    – MongoDB _id of the user
 *   x-user-email – email address of the user
 *
 * No JWT re-validation is performed here; the gateway is the single
 * source of truth for authentication.
 */
@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;

    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];

    if (!userId || !userEmail) {
      throw new UnauthorizedException(
        'Missing identity headers. Requests must pass through the API Gateway.',
      );
    }

    // Attach a normalised user object so @CurrentUser() works uniformly.
    req.user = { userId, email: userEmail };
    return true;
  }
}
