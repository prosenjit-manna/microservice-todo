import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../users/schemas/user.schema';

@ObjectType()
export class AuthResponse {
  @Field({ description: 'JWT access token' })
  accessToken: string;

  @Field(() => User, { description: 'Authenticated user details' })
  user: User;
}
