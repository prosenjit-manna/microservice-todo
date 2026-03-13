import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { UserEventsService } from './user-events.service';
import { UserDocument } from './schemas/user.schema';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userEventsService: UserEventsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  async create(createUserInput: CreateUserInput): Promise<UserDocument> {
    const existing = await this.usersRepository.findOne({
      $or: [{ email: createUserInput.email }, { username: createUserInput.username }],
    });

    if (existing) {
      throw new ConflictException('Email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserInput.password, BCRYPT_ROUNDS);
    const user = await this.usersRepository.create({
      ...createUserInput,
      password: hashedPassword,
    });

    this.logger.log(`User created: ${user.email}`, UsersService.name);
    this.userEventsService.emitUserCreated(user);

    return user;
  }

  async findAll(): Promise<UserDocument[]> {
    return this.usersRepository.findAll({ isActive: true });
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.usersRepository.findByUsername(username);
  }

  async update(id: string, updateUserInput: UpdateUserInput): Promise<UserDocument> {
    const user = await this.usersRepository.update(id, updateUserInput);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    this.logger.log(`User updated: ${user.email}`, UsersService.name);
    this.userEventsService.emitUserUpdated(user);

    return user;
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<UserDocument> {
    const userWithPassword = await this.usersRepository.findOne({ _id: id });
    if (!userWithPassword) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const userAuth = await this.usersRepository.findByEmail(userWithPassword.email);
    const isValid = userAuth
      ? await bcrypt.compare(currentPassword, userAuth.password)
      : false;

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updated = await this.usersRepository.updatePassword(id, hashedPassword);
    if (!updated) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    this.logger.log(`Password changed for user: ${updated.email}`, UsersService.name);
    return updated;
  }

  async remove(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.remove(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    this.logger.log(`User deleted: ${user.email}`, UsersService.name);
    this.userEventsService.emitUserDeleted(id);

    return user;
  }

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    return user;
  }
}
