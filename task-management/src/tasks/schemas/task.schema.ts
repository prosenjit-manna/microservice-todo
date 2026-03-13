import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

registerEnumType(TaskStatus, {
  name: 'TaskStatus',
  description: 'Possible task status values',
});

registerEnumType(TaskPriority, {
  name: 'TaskPriority',
  description: 'Possible task priority values',
});

export type TaskDocument = HydratedDocument<Task>;

@ObjectType()
@Schema({ timestamps: true, versionKey: false })
export class Task {
  @Field(() => ID)
  _id: string;

  @Field()
  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Field({ nullable: true })
  @Prop({ trim: true, maxlength: 2000 })
  description?: string;

  @Field(() => TaskStatus)
  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Field(() => TaskPriority)
  @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  /** ID of the user who created the task */
  @Field()
  @Prop({ required: true })
  creatorId: string;

  /** ID of the user assigned to work on the task */
  @Field({ nullable: true })
  @Prop()
  assigneeId?: string;

  @Field({ nullable: true })
  @Prop()
  dueDate?: Date;

  @Field(() => [String])
  @Prop({ type: [String], default: [] })
  tags: string[];

  @Field()
  @Prop({ default: true })
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Indexes for common queries
TaskSchema.index({ creatorId: 1 });
TaskSchema.index({ assigneeId: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ tags: 1 });
TaskSchema.index({ dueDate: 1 });
