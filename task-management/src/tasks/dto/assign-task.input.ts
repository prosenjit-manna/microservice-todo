import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
export class AssignTaskInput {
  @Field(() => ID)
  @IsString()
  taskId: string;

  /** Set to null / omit to unassign the task */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}
