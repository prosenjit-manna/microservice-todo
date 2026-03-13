import { Module } from '@nestjs/common';
import { GatewayAuthGuard } from './guards/jwt-auth.guard';

/**
 * AuthModule for the Task Management service.
 *
 * Authentication is fully delegated to the API Gateway (e.g. Traefik +
 * a dedicated auth middleware). The gateway validates the JWT and forwards
 * the caller's identity as HTTP headers:
 *   x-user-id    – authenticated user's MongoDB _id
 *   x-user-email – authenticated user's email
 *
 * GatewayAuthGuard reads those headers and rejects requests that lack them.
 * No JWT library or Passport strategy is needed here.
 */
@Module({
  providers: [GatewayAuthGuard],
  exports: [GatewayAuthGuard],
})
export class AuthModule {}
