import { InputType, Field, ID } from '@nestjs/graphql';
import { IsEnum, IsString } from 'class-validator';
import { TaskStatus } from '../schemas/task.schema';

@InputType()
export class UpdateTaskStatusInput {
  @Field(() => ID)
  @IsString()
  taskId: string;

  @Field(() => TaskStatus)
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
