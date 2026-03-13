import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { winstonConfig } from './common/logger/winston.logger';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Centralised Winston logging
    WinstonModule.forRoot(winstonConfig),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/task-management',
        ),
      }),
      inject: [ConfigService],
    }),

    // GraphQL – Apollo Federation v2 subgraph
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        path: join(process.cwd(), 'dist/schema.gql'),
        federation: 2,
      },
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req }) => ({ req }),
    }),

    TasksModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
