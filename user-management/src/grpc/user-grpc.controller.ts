import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';

interface GrpcUserResponse {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  bio: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Controller()
export class UserGrpcController {
  constructor(private readonly usersService: UsersService) {}

  @GrpcMethod('UserService', 'GetUser')
  async getUser(data: { id: string }): Promise<GrpcUserResponse> {
    const user = await this.usersService.findOne(data.id);
    return this.toGrpcResponse(user);
  }

  @GrpcMethod('UserService', 'GetUsersByIds')
  async getUsersByIds(data: { ids: string[] }): Promise<{ users: GrpcUserResponse[] }> {
    const results = await Promise.all(
      data.ids.map((id) => this.usersService.findOne(id).catch(() => null)),
    );
    return {
      users: results
        .filter((u): u is UserDocument => u !== null)
        .map((u) => this.toGrpcResponse(u)),
    };
  }

  @GrpcMethod('UserService', 'ValidateUser')
  async validateUser(data: {
    email: string;
    password: string;
  }): Promise<{ isValid: boolean; user: GrpcUserResponse | null }> {
    const user = await this.usersService.validateUser(data.email, data.password);
    if (!user) {
      return { isValid: false, user: null };
    }
    return { isValid: true, user: this.toGrpcResponse(user) };
  }

  private toGrpcResponse(user: UserDocument): GrpcUserResponse {
    return {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
      roles: user.roles || [],
      isActive: user.isActive,
      createdAt: user.createdAt?.toISOString() || '',
      updatedAt: user.updatedAt?.toISOString() || '',
    };
  }
}
