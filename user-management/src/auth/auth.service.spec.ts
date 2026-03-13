import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const mockUsersService = {
  validateUser: jest.fn(),
  findByUsername: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
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
  isActive: true,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('should return auth response when logging in with email', async () => {
      mockUsersService.validateUser.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login({
        emailOrUsername: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({ accessToken: 'jwt-token', user: mockUser });
      expect(mockUsersService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should return auth response when logging in with username', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockUsersService.validateUser.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login({
        emailOrUsername: 'testuser',
        password: 'password123',
      });

      expect(result).toEqual({ accessToken: 'jwt-token', user: mockUser });
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(mockUsersService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockUsersService.validateUser.mockResolvedValue(null);

      await expect(
        service.login({ emailOrUsername: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when username not found', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);

      await expect(
        service.login({ emailOrUsername: 'unknownuser', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockUsersService.validateUser.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({ emailOrUsername: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
