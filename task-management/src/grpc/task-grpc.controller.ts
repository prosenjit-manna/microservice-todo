import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { TasksService } from '../tasks/tasks.service';
import { TaskDocument } from '../tasks/schemas/task.schema';

interface GrpcTaskResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  creatorId: string;
  assigneeId: string;
  dueDate: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Controller()
export class TaskGrpcController {
  constructor(private readonly tasksService: TasksService) {}

  @GrpcMethod('TaskService', 'GetTask')
  async getTask(data: { id: string }): Promise<GrpcTaskResponse> {
    const task = await this.tasksService.findOne(data.id);
    return this.toGrpcResponse(task);
  }

  @GrpcMethod('TaskService', 'GetTasksByAssignee')
  async getTasksByAssignee(data: {
    assigneeId: string;
  }): Promise<{ tasks: GrpcTaskResponse[] }> {
    const tasks = await this.tasksService.findByAssignee(data.assigneeId);
    return { tasks: tasks.map((t) => this.toGrpcResponse(t)) };
  }

  @GrpcMethod('TaskService', 'GetTasksByCreator')
  async getTasksByCreator(data: {
    creatorId: string;
  }): Promise<{ tasks: GrpcTaskResponse[] }> {
    const tasks = await this.tasksService.findByCreator(data.creatorId);
    return { tasks: tasks.map((t) => this.toGrpcResponse(t)) };
  }

  @GrpcMethod('TaskService', 'GetTasksByIds')
  async getTasksByIds(data: {
    ids: string[];
  }): Promise<{ tasks: GrpcTaskResponse[] }> {
    const results = await Promise.all(
      data.ids.map((id) => this.tasksService.findOne(id).catch(() => null)),
    );
    return {
      tasks: results
        .filter((t): t is TaskDocument => t !== null)
        .map((t) => this.toGrpcResponse(t)),
    };
  }

  private toGrpcResponse(task: TaskDocument): GrpcTaskResponse {
    return {
      id: task._id.toString(),
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      creatorId: task.creatorId,
      assigneeId: task.assigneeId || '',
      dueDate: task.dueDate?.toISOString() || '',
      tags: task.tags || [],
      isActive: task.isActive,
      createdAt: task.createdAt?.toISOString() || '',
      updatedAt: task.updatedAt?.toISOString() || '',
    };
  }
}
