import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TasksRepository } from './tasks.repository';
import { TaskEventsService } from './task-events.service';
import { TaskDocument, TaskStatus } from './schemas/task.schema';
import { CreateTaskInput } from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';
import { AssignTaskInput } from './dto/assign-task.input';
import { UpdateTaskStatusInput } from './dto/update-task-status.input';
import { TaskFiltersInput } from './dto/task-filters.input';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly taskEventsService: TaskEventsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  async create(
    createTaskInput: CreateTaskInput,
    creatorId: string,
  ): Promise<TaskDocument> {
    const task = await this.tasksRepository.create({
      ...createTaskInput,
      creatorId,
    });

    this.logger.log(
      `Task created: "${task.title}" by user ${creatorId}`,
      TasksService.name,
    );
    this.taskEventsService.emitTaskCreated(task);

    return task;
  }

  async findAll(filters: TaskFiltersInput = {}): Promise<TaskDocument[]> {
    return this.tasksRepository.findAll(filters);
  }

  async findOne(id: string): Promise<TaskDocument> {
    const task = await this.tasksRepository.findById(id);
    if (!task || !task.isActive) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    return task;
  }

  async findByCreator(
    creatorId: string,
    filters: TaskFiltersInput = {},
  ): Promise<TaskDocument[]> {
    return this.tasksRepository.findByCreator(creatorId, filters);
  }

  async findByAssignee(
    assigneeId: string,
    filters: TaskFiltersInput = {},
  ): Promise<TaskDocument[]> {
    return this.tasksRepository.findByAssignee(assigneeId, filters);
  }

  async update(
    id: string,
    updateTaskInput: UpdateTaskInput,
    requesterId: string,
  ): Promise<TaskDocument> {
    const existing = await this.findOne(id);
    this.assertCreatorOrAdmin(existing, requesterId);

    const task = await this.tasksRepository.update(id, updateTaskInput);
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }

    this.logger.log(
      `Task updated: "${task.title}" by user ${requesterId}`,
      TasksService.name,
    );
    this.taskEventsService.emitTaskUpdated(task);

    return task;
  }

  async assignTask(
    input: AssignTaskInput,
    requesterId: string,
  ): Promise<TaskDocument> {
    const existing = await this.findOne(input.taskId);
    this.assertCreatorOrAdmin(existing, requesterId);

    const task = await this.tasksRepository.updateAssignee(
      input.taskId,
      input.assigneeId ?? null,
    );
    if (!task) {
      throw new NotFoundException(`Task with id ${input.taskId} not found`);
    }

    this.logger.log(
      `Task "${task.title}" assigned to ${task.assigneeId ?? 'nobody'} by ${requesterId}`,
      TasksService.name,
    );
    this.taskEventsService.emitTaskAssigned(task);

    return task;
  }

  async updateStatus(
    input: UpdateTaskStatusInput,
    requesterId: string,
  ): Promise<TaskDocument> {
    const existing = await this.findOne(input.taskId);

    // Both the creator and the assignee can update the status
    if (
      existing.creatorId !== requesterId &&
      existing.assigneeId !== requesterId
    ) {
      throw new ForbiddenException(
        'Only the task creator or assignee can change the status',
      );
    }

    const task = await this.tasksRepository.updateStatus(
      input.taskId,
      input.status,
    );
    if (!task) {
      throw new NotFoundException(`Task with id ${input.taskId} not found`);
    }

    this.logger.log(
      `Task "${task.title}" status changed to ${task.status} by ${requesterId}`,
      TasksService.name,
    );
    this.taskEventsService.emitTaskStatusChanged(task);

    return task;
  }

  async remove(id: string, requesterId: string): Promise<TaskDocument> {
    const existing = await this.findOne(id);
    this.assertCreatorOrAdmin(existing, requesterId);

    const task = await this.tasksRepository.softDelete(id);
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }

    this.logger.log(
      `Task deleted: "${task.title}" by user ${requesterId}`,
      TasksService.name,
    );
    this.taskEventsService.emitTaskDeleted(id);

    return task;
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private assertCreatorOrAdmin(task: TaskDocument, userId: string): void {
    if (task.creatorId !== userId) {
      throw new ForbiddenException(
        'Only the task creator can perform this action',
      );
    }
  }
}
