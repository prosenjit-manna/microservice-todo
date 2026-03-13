import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TasksService } from './tasks.service';
import { TasksResolver } from './tasks.resolver';
import { TasksRepository } from './tasks.repository';
import { TaskEventsService } from './task-events.service';
import { Task, TaskSchema } from './schemas/task.schema';
import { TaskGrpcController } from '../grpc/task-grpc.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),

    // RabbitMQ client for publishing task events
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
            ],
            queue: 'task_events_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [TaskGrpcController],
  providers: [TasksService, TasksResolver, TasksRepository, TaskEventsService],
  exports: [TasksService],
})
export class TasksModule {}
