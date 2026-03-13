import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/** Shape of the user object populated by GatewayAuthGuard */
export interface GatewayUser {
  userId: string;
  email: string;
}

/**
 * Extracts the authenticated user from the request context.
 * The user is populated by GatewayAuthGuard from gateway-forwarded headers.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): GatewayUser => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
