import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { winstonConfig } from './common/logger/winston.logger';
import { HealthController } from './health/health.controller';

/**
 * Forward the original HTTP headers (Authorization, x-user-id, x-user-email, etc.)
 * from the incoming gateway request to every downstream subgraph, so that each
 * subgraph receives the identity headers set by Traefik / the auth middleware.
 */
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    const headers: Record<string, string> = context?.req?.headers ?? {};
    const forwarded = [
      'authorization',
      'x-user-id',
      'x-user-email',
      'x-request-id',
    ];
    forwarded.forEach((header) => {
      if (headers[header]) {
        request.http.headers.set(header, headers[header]);
      }
    });
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    WinstonModule.forRoot(winstonConfig),

    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        server: {
          // Playground is served at GET /graphql
          playground: configService.get<string>('NODE_ENV') !== 'production',
          introspection: true,
          // Pass the Express request into the GraphQL context so
          // AuthenticatedDataSource can forward headers downstream.
          context: ({ req }) => ({ req }),
        },
        gateway: {
          supergraphSdl: new IntrospectAndCompose({
            subgraphs: [
              {
                name: 'user-management',
                url: configService.get<string>(
                  'USER_MANAGEMENT_URL',
                  'http://localhost:3001/graphql',
                ),
              },
              {
                name: 'task-management',
                url: configService.get<string>(
                  'TASK_MANAGEMENT_URL',
                  'http://localhost:3002/graphql',
                ),
              },
            ],
            // Re-poll subgraph schemas every 30 s so schema changes are picked
            // up automatically without restarting the gateway.
            pollIntervalInMs: 30_000,
          }),
          buildService({ url }) {
            return new AuthenticatedDataSource({ url });
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
