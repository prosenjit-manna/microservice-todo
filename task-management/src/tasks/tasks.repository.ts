import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from './schemas/task.schema';
import { CreateTaskInput } from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';
import { TaskFiltersInput } from './dto/task-filters.input';

@Injectable()
export class TasksRepository {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

  async create(
    data: CreateTaskInput & { creatorId: string },
  ): Promise<TaskDocument> {
    const task = new this.taskModel(data);
    return task.save();
  }

  async findAll(filters: TaskFiltersInput = {}): Promise<TaskDocument[]> {
    const query: FilterQuery<TaskDocument> = { isActive: true };

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters.tags?.length) query.tags = { $in: filters.tags };
    if (filters.dueBefore || filters.dueAfter) {
      query.dueDate = {};
      if (filters.dueBefore) query.dueDate.$lte = filters.dueBefore;
      if (filters.dueAfter) query.dueDate.$gte = filters.dueAfter;
    }

    return this.taskModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<TaskDocument | null> {
    return this.taskModel.findById(id).exec();
  }

  async findByCreator(
    creatorId: string,
    filters: TaskFiltersInput = {},
  ): Promise<TaskDocument[]> {
    const query: FilterQuery<TaskDocument> = { creatorId, isActive: true };
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    return this.taskModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findByAssignee(
    assigneeId: string,
    filters: TaskFiltersInput = {},
  ): Promise<TaskDocument[]> {
    const query: FilterQuery<TaskDocument> = { assigneeId, isActive: true };
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    return this.taskModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async update(
    id: string,
    updateData: Partial<UpdateTaskInput>,
  ): Promise<TaskDocument | null> {
    return this.taskModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
  }

  async updateAssignee(
    id: string,
    assigneeId: string | null,
  ): Promise<TaskDocument | null> {
    const updateOp =
      assigneeId === null
        ? { $unset: { assigneeId: '' } }
        : { $set: { assigneeId } };
    return this.taskModel.findByIdAndUpdate(id, updateOp, { new: true }).exec();
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
  ): Promise<TaskDocument | null> {
    return this.taskModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .exec();
  }

  async softDelete(id: string): Promise<TaskDocument | null> {
    return this.taskModel
      .findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true },
      )
      .exec();
  }

  async countByCreator(creatorId: string): Promise<number> {
    return this.taskModel.countDocuments({ creatorId, isActive: true }).exec();
  }

  async countByStatus(status: TaskStatus): Promise<number> {
    return this.taskModel.countDocuments({ status, isActive: true }).exec();
  }
}
