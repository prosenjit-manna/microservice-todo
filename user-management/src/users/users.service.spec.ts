import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UserEventsService } from './user-events.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockUsersRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  update: jest.fn(),
  updatePassword: jest.fn(),
  remove: jest.fn(),
};

const mockUserEventsService = {
  emitUserCreated: jest.fn(),
  emitUserUpdated: jest.fn(),
  emitUserDeleted: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockUser = {
  _id: 'userId123',
  email: 'test@example.com',
  username: 'testuser',
  password: 'hashedPassword',
  firstName: 'Test',
  lastName: 'User',
  roles: ['user'],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: UserEventsService, useValue: mockUserEventsService },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const createUserInput = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    };

    it('should create a new user and emit event', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUsersRepository.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserInput);

      expect(mockUsersRepository.findOne).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        ...createUserInput,
        password: 'hashedPassword',
      });
      expect(mockUserEventsService.emitUserCreated).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email or username already exists', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserInput)).rejects.toThrow(ConflictException);
      expect(mockUsersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findOne('userId123');
      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findById).toHaveBeenCalledWith('userId123');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user profile and emit event', async () => {
      const updateInput = { firstName: 'Updated' };
      const updatedUser = { ...mockUser, firstName: 'Updated' };
      mockUsersRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update('userId123', updateInput);

      expect(result).toEqual(updatedUser);
      expect(mockUserEventsService.emitUserUpdated).toHaveBeenCalledWith(updatedUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.update.mockResolvedValue(null);

      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a user and emit event', async () => {
      mockUsersRepository.remove.mockResolvedValue(mockUser);

      const result = await service.remove('userId123');

      expect(result).toEqual(mockUser);
      expect(mockUserEventsService.emitUserDeleted).toHaveBeenCalledWith('userId123');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.remove.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('unknown@example.com', 'password123');
      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');
      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userWithPassword = { ...mockUser, password: 'hashedCurrent' };
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUsersRepository.findByEmail.mockResolvedValue(userWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNew');
      mockUsersRepository.updatePassword.mockResolvedValue(mockUser);

      const result = await service.changePassword('userId123', 'currentPass', 'newPass123');
      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.updatePassword).toHaveBeenCalledWith('userId123', 'hashedNew');
    });

    it('should throw UnauthorizedException on wrong current password', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('userId123', 'wrongPassword', 'newPass123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
