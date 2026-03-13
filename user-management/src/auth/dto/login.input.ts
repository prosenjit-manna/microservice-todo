import { InputType, Field } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class LoginInput {
  @Field({ description: 'Email address or username' })
  @IsString()
  emailOrUsername: string;

  @Field()
  @IsString()
  password: string;
}
