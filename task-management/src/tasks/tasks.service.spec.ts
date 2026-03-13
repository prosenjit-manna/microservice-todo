import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { TaskEventsService } from './task-events.service';
import { TaskStatus, TaskPriority } from './schemas/task.schema';

const mockTasksRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCreator: jest.fn(),
  findByAssignee: jest.fn(),
  update: jest.fn(),
  updateAssignee: jest.fn(),
  updateStatus: jest.fn(),
  softDelete: jest.fn(),
};

const mockTaskEventsService = {
  emitTaskCreated: jest.fn(),
  emitTaskUpdated: jest.fn(),
  emitTaskDeleted: jest.fn(),
  emitTaskAssigned: jest.fn(),
  emitTaskStatusChanged: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const creatorId = 'creator-user-id';
const assigneeId = 'assignee-user-id';
const otherUserId = 'other-user-id';

const mockTask = {
  _id: 'task-id-123',
  title: 'Test Task',
  description: 'Task description',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  creatorId,
  assigneeId,
  dueDate: new Date('2026-12-31'),
  tags: ['test'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: mockTasksRepository },
        { provide: TaskEventsService, useValue: mockTaskEventsService },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    const createInput = {
      title: 'New Task',
      description: 'A new task',
      priority: TaskPriority.HIGH,
    };

    it('should create a task and emit event', async () => {
      mockTasksRepository.create.mockResolvedValue(mockTask);

      const result = await service.create(createInput, creatorId);

      expect(mockTasksRepository.create).toHaveBeenCalledWith({
        ...createInput,
        creatorId,
      });
      expect(mockTaskEventsService.emitTaskCreated).toHaveBeenCalledWith(mockTask);
      expect(result).toEqual(mockTask);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a task by id', async () => {
      mockTasksRepository.findById.mockResolvedValue(mockTask);

      const result = await service.findOne('task-id-123');
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task is not found', async () => {
      mockTasksRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when task is soft-deleted', async () => {
      mockTasksRepository.findById.mockResolvedValue({
        ...mockTask,
        isActive: false,
      });

      await expect(service.findOne('task-id-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all active tasks', async () => {
      mockTasksRepository.findAll.mockResolvedValue([mockTask]);

      const result = await service.findAll();
      expect(result).toEqual([mockTask]);
    });
  });

  // ── findByCreator ──────────────────────────────────────────────────────

  describe('findByCreator', () => {
    it('should return tasks by creator', async () => {
      mockTasksRepository.findByCreator.mockResolvedValue([mockTask]);

      const result = await service.findByCreator(creatorId);
      expect(result).toEqual([mockTask]);
      expect(mockTasksRepository.findByCreator).toHaveBeenCalledWith(
        creatorId,
        {},
      );
    });
  });

  // ── findByAssignee ─────────────────────────────────────────────────────

  describe('findByAssignee', () => {
    it('should return tasks assigned to user', async () => {
      mockTasksRepository.findByAssignee.mockResolvedValue([mockTask]);

      const result = await service.findByAssignee(assigneeId);
      expect(result).toEqual([mockTask]);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    const updateInput = { title: 'Updated Task Title' };

    it('should update a task and emit event', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Task Title' };
      mockTasksRepository.findById.mockResolvedValue(mockTask);
      mockTasksRepository.update.mockResolvedValue(updatedTask);

      const result = await service.update('task-id-123', updateInput, creatorId);

      expect(result).toEqual(updatedTask);
      expect(mockTaskEventsService.emitTaskUpdated).toHaveBeenCalledWith(
        updatedTask,
      );
    });

    it('should throw ForbiddenException when non-creator tries to update', async () => {
      mockTasksRepository.findById.mockResolvedValue(mockTask);

      await expect(
        service.update('task-id-123', updateInput, otherUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockTasksRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', updateInput, creatorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── assignTask ─────────────────────────────────────────────────────────

  describe('assignTask', () => {
    it('should assign a task and emit event', async () => {
      const assignedTask = { ...mockTask, assigneeId: 'new-assignee' };
      mockTasksRepository.findById.mockResolvedValue(mockTask);
      mockTasksRepository.updateAssignee.mockResolvedValue(assignedTask);

      const result = await service.assignTask(
        { taskId: 'task-id-123', assigneeId: 'new-assignee' },
        creatorId,
      );

      expect(result).toEqual(assignedTask);
      expect(mockTaskEventsService.emitTaskAssigned).toHaveBeenCalledWith(
        assignedTask,
      );
    });

    it('should allow unassigning (null assigneeId)', async () => {
      const unassignedTask = { ...mockTask, assigneeId: undefined };
      mockTasksRepository.findById.mockResolvedValue(mockTask);
      mockTasksRepository.updateAssignee.mockResolvedValue(unassignedTask);

      const result = await service.assignTask(
        { taskId: 'task-id-123' },
        creatorId,
      );

      expect(mockTasksRepository.updateAssignee).toHaveBeenCalledWith(
        'task-id-123',
        null,
      );
      expect(result).toEqual(unassignedTask);
    });

    it('should throw ForbiddenException when non-creator tries to assign', async () => {
      mockTasksRepository.findById.mockResolvedValue(mockTask);

      await expect(
        service.assignTask(
          { taskId: 'task-id-123', assigneeId: 'someone' },
          otherUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── updateStatus ───────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should allow creator to update status', async () => {
      const updatedTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      mockTasksRepository.findById.mockResolvedValue(mockTask);
      mockTasksRepository.updateStatus.mockResolvedValue(updatedTask);

      const result = await service.updateStatus(
        { taskId: 'task-id-123', status: TaskStatus.IN_PROGRESS },
        creatorId,
      );

      expect(result).toEqual(updatedTask);
      expect(mockTaskEventsService.emitTaskStatusChanged).toHaveBeenCalledWith(
        updatedTask,
      );
    });

    it('should allow assignee to update status', async () => {
      const updatedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      mockTasksRepository.findById.mockResolvedValue(mockTask);
      mockTasksRepository.updateStatus.mockResolvedValue(updatedTask);

      const result = await service.updateStatus(
        { taskId: 'task-id-123', status: TaskStatus.COMPLETED },
        assigneeId,
      );

      expect(result).toEqual(updatedTask);
    });

    it('should throw ForbiddenException when unrelated user tries to change status', async () => {
      mockTasksRepository.findById.mockResolvedValue(mockTask);

      await expect(
        service.updateStatus(
          { taskId: 'task-id-123', status: TaskStatus.COMPLETED },
          otherUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should soft-delete a task and emit event', async () => {
      const deletedTask = { ...mockTask, isActive: false };
      mockTasksRepository.findById.mockResolvedValue(mockTask);
      mockTasksRepository.softDelete.mockResolvedValue(deletedTask);

      const result = await service.remove('task-id-123', creatorId);

      expect(result).toEqual(deletedTask);
      expect(mockTaskEventsService.emitTaskDeleted).toHaveBeenCalledWith(
        'task-id-123',
      );
    });

    it('should throw ForbiddenException when non-creator tries to delete', async () => {
      mockTasksRepository.findById.mockResolvedValue(mockTask);

      await expect(service.remove('task-id-123', otherUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockTasksRepository.findById.mockResolvedValue(null);

      await expect(service.remove('nonexistent', creatorId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
