import { Resolver, Query, Mutation, Args, ID, ResolveReference } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { ChangePasswordInput } from './dto/change-password.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  // Federation: resolve User entity by _id when requested by another subgraph
  @ResolveReference()
  async resolveReference(reference: { __typename: string; _id: string }): Promise<User> {
    return this.usersService.findOne(reference._id);
  }

  // Public: register a new user
  @Mutation(() => User, { description: 'Register a new user account' })
  async register(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<User> {
    return this.usersService.create(createUserInput);
  }

  // Protected: list all active users (admin use)
  @Query(() => [User], { name: 'users', description: 'Get all active users' })
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  // Protected: get a user by ID
  @Query(() => User, { name: 'user', description: 'Get a user by ID' })
  @UseGuards(JwtAuthGuard)
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  // Protected: get current authenticated user profile
  @Query(() => User, { name: 'me', description: 'Get the current authenticated user' })
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User): Promise<User> {
    return this.usersService.findOne(user._id.toString());
  }

  // Protected: update current user profile
  @Mutation(() => User, { description: 'Update the current user profile' })
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() currentUser: User,
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
  ): Promise<User> {
    return this.usersService.update(currentUser._id.toString(), updateUserInput);
  }

  // Protected: change current user password
  @Mutation(() => User, { description: 'Change the current user password' })
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() currentUser: User,
    @Args('changePasswordInput') changePasswordInput: ChangePasswordInput,
  ): Promise<User> {
    return this.usersService.changePassword(
      currentUser._id.toString(),
      changePasswordInput.currentPassword,
      changePasswordInput.newPassword,
    );
  }

  // Protected: delete current user account
  @Mutation(() => User, { description: 'Delete the current user account' })
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@CurrentUser() currentUser: User): Promise<User> {
    return this.usersService.remove(currentUser._id.toString());
  }
}
