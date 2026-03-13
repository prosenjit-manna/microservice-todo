import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import { AppModule } from './app.module';
import { winstonConfig } from './common/logger/winston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  // gRPC microservice — only started when GRPC_ENABLED=true (production / Docker)
  // Set GRPC_ENABLED=false in .env for local dev to avoid port conflicts
  if (process.env.GRPC_ENABLED === 'true') {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'user',
        protoPath: join(__dirname, 'proto/user.proto'),
        url: process.env.GRPC_URL || '0.0.0.0:50051',
      },
    });
  }

  // RabbitMQ microservice for event-driven communication
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'user_queue',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3001);

  console.log(`User Management Service running on port ${process.env.PORT || 3001}`);
  if (process.env.GRPC_ENABLED === 'true') {
    console.log(`gRPC listening on ${process.env.GRPC_URL || '0.0.0.0:50051'}`);
  }
}

bootstrap();
