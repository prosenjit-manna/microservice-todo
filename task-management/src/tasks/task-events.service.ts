import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TaskDocument } from './schemas/task.schema';

@Injectable()
export class TaskEventsService {
  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly rabbitMQClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  emitTaskCreated(task: TaskDocument): void {
    const payload = {
      id: task._id.toString(),
      title: task.title,
      status: task.status,
      priority: task.priority,
      creatorId: task.creatorId,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
      tags: task.tags,
      createdAt: task.createdAt,
    };
    this.rabbitMQClient.emit('task.created', payload);
    this.logger.log(
      `Event emitted: task.created for "${task.title}"`,
      TaskEventsService.name,
    );
  }

  emitTaskUpdated(task: TaskDocument): void {
    const payload = {
      id: task._id.toString(),
      title: task.title,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      updatedAt: task.updatedAt,
    };
    this.rabbitMQClient.emit('task.updated', payload);
    this.logger.log(
      `Event emitted: task.updated for "${task.title}"`,
      TaskEventsService.name,
    );
  }

  emitTaskDeleted(taskId: string): void {
    this.rabbitMQClient.emit('task.deleted', { id: taskId });
    this.logger.log(
      `Event emitted: task.deleted for id ${taskId}`,
      TaskEventsService.name,
    );
  }

  emitTaskAssigned(task: TaskDocument): void {
    const payload = {
      id: task._id.toString(),
      title: task.title,
      assigneeId: task.assigneeId ?? null,
      creatorId: task.creatorId,
    };
    this.rabbitMQClient.emit('task.assigned', payload);
    this.logger.log(
      `Event emitted: task.assigned for "${task.title}" → assignee: ${task.assigneeId ?? 'unassigned'}`,
      TaskEventsService.name,
    );
  }

  emitTaskStatusChanged(task: TaskDocument): void {
    const payload = {
      id: task._id.toString(),
      title: task.title,
      status: task.status,
      assigneeId: task.assigneeId,
      creatorId: task.creatorId,
    };
    this.rabbitMQClient.emit('task.statusChanged', payload);
    this.logger.log(
      `Event emitted: task.statusChanged for "${task.title}" → ${task.status}`,
      TaskEventsService.name,
    );
  }
}
