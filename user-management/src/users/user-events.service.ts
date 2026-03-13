import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserDocument } from './schemas/user.schema';

@Injectable()
export class UserEventsService {
  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly rabbitMQClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  emitUserCreated(user: UserDocument): void {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      roles: user.roles,
      createdAt: user.createdAt,
    };
    this.rabbitMQClient.emit('user.created', payload);
    this.logger.log(`Event emitted: user.created for ${user.email}`, UserEventsService.name);
  }

  emitUserUpdated(user: UserDocument): void {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      updatedAt: user.updatedAt,
    };
    this.rabbitMQClient.emit('user.updated', payload);
    this.logger.log(`Event emitted: user.updated for ${user.email}`, UserEventsService.name);
  }

  emitUserDeleted(userId: string): void {
    this.rabbitMQClient.emit('user.deleted', { id: userId });
    this.logger.log(`Event emitted: user.deleted for id ${userId}`, UserEventsService.name);
  }
}
