import { Injectable, UnauthorizedException, Inject, LoggerService } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UsersService } from '../users/users.service';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth-response';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  async login(loginInput: LoginInput): Promise<AuthResponse> {
    const { emailOrUsername, password } = loginInput;

    let user: UserDocument | null = null;

    // Support login with email or username
    if (emailOrUsername.includes('@')) {
      user = await this.usersService.validateUser(emailOrUsername, password);
    } else {
      const found = await this.usersService.findByUsername(emailOrUsername);
      if (found) {
        user = await this.usersService.validateUser(found.email, password);
      }
    }

    if (!user || !user.isActive) {
      this.logger.warn(
        `Failed login attempt for: ${emailOrUsername}`,
        AuthService.name,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user._id.toString(), email: user.email };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User logged in: ${user.email}`, AuthService.name);

    return { accessToken, user };
  }
}
