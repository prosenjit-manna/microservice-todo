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

  // gRPC microservice (enabled via env flag to avoid port conflicts in local dev)
  if (process.env.GRPC_ENABLED === 'true') {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'task',
        protoPath: join(__dirname, 'proto/task.proto'),
        url: process.env.GRPC_URL || '0.0.0.0:50052',
      },
    });
  }

  // RabbitMQ consumer for incoming task events from other microservices
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'task_queue',
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
  await app.listen(process.env.PORT || 3002);

  console.log(
    `Task Management Service running on port ${process.env.PORT || 3002}`,
  );
  if (process.env.GRPC_ENABLED === 'true') {
    console.log(`gRPC listening on ${process.env.GRPC_URL || '0.0.0.0:50052'}`);
  }
}

bootstrap();
