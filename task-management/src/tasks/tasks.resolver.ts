import { Resolver, Query, Mutation, Args, ID, ResolveReference } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './schemas/task.schema';
import { CreateTaskInput } from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';
import { AssignTaskInput } from './dto/assign-task.input';
import { UpdateTaskStatusInput } from './dto/update-task-status.input';
import { TaskFiltersInput } from './dto/task-filters.input';
import { GatewayAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, GatewayUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Task)
@UseGuards(GatewayAuthGuard)
export class TasksResolver {
  constructor(private readonly tasksService: TasksService) {}

  // Federation: resolve Task entity by _id when referenced by another subgraph
  @ResolveReference()
  async resolveReference(reference: { __typename: string; _id: string }): Promise<Task> {
    return this.tasksService.findOne(reference._id);
  }

  // ── Mutations ─────────────────────────────────────────────────────────

  @Mutation(() => Task, { description: 'Create a new task' })
  async createTask(
    @Args('createTaskInput') createTaskInput: CreateTaskInput,
    @CurrentUser() currentUser: GatewayUser,
  ): Promise<Task> {
    return this.tasksService.create(createTaskInput, currentUser.userId);
  }

  @Mutation(() => Task, { description: 'Update an existing task (creator only)' })
  async updateTask(
    @Args('id', { type: () => ID }) id: string,
    @Args('updateTaskInput') updateTaskInput: UpdateTaskInput,
    @CurrentUser() currentUser: GatewayUser,
  ): Promise<Task> {
    return this.tasksService.update(id, updateTaskInput, currentUser.userId);
  }

  @Mutation(() => Task, { description: 'Soft-delete a task (creator only)' })
  async deleteTask(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: GatewayUser,
  ): Promise<Task> {
    return this.tasksService.remove(id, currentUser.userId);
  }

  @Mutation(() => Task, { description: 'Assign (or unassign) a task to a user (creator only)' })
  async assignTask(
    @Args('assignTaskInput') assignTaskInput: AssignTaskInput,
    @CurrentUser() currentUser: GatewayUser,
  ): Promise<Task> {
    return this.tasksService.assignTask(assignTaskInput, currentUser.userId);
  }

  @Mutation(() => Task, { description: 'Update the status of a task (creator or assignee)' })
  async updateTaskStatus(
    @Args('updateTaskStatusInput') updateTaskStatusInput: UpdateTaskStatusInput,
    @CurrentUser() currentUser: GatewayUser,
  ): Promise<Task> {
    return this.tasksService.updateStatus(
      updateTaskStatusInput,
      currentUser.userId,
    );
  }

  // ── Queries ────────────────────────────────────────────────────────────

  @Query(() => [Task], { name: 'tasks', description: 'Get all active tasks with optional filters' })
  async findAll(
    @Args('filters', { type: () => TaskFiltersInput, nullable: true })
    filters?: TaskFiltersInput,
  ): Promise<Task[]> {
    return this.tasksService.findAll(filters ?? {});
  }

  @Query(() => Task, { name: 'task', description: 'Get a task by ID' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }

  @Query(() => [Task], { name: 'myTasks', description: 'Get tasks created by the current user' })
  async myTasks(
    @CurrentUser() currentUser: GatewayUser,
    @Args('filters', { type: () => TaskFiltersInput, nullable: true })
    filters?: TaskFiltersInput,
  ): Promise<Task[]> {
    return this.tasksService.findByCreator(currentUser.userId, filters ?? {});
  }

  @Query(() => [Task], { name: 'assignedTasks', description: 'Get tasks assigned to the current user' })
  async assignedTasks(
    @CurrentUser() currentUser: GatewayUser,
    @Args('filters', { type: () => TaskFiltersInput, nullable: true })
    filters?: TaskFiltersInput,
  ): Promise<Task[]> {
    return this.tasksService.findByAssignee(currentUser.userId, filters ?? {});
  }
}
