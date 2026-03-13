import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, ID, ObjectType, registerEnumType, Directive } from '@nestjs/graphql';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'Available user roles',
});

export type UserDocument = HydratedDocument<User>;

@ObjectType()
@Directive('@key(fields: "_id")')
@Schema({ timestamps: true, versionKey: false })
export class User {
  @Field(() => ID)
  _id: string;

  @Field()
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Field()
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  // Password is excluded from GraphQL schema and select by default
  @Prop({ required: true, select: false })
  password: string;

  @Field({ nullable: true })
  @Prop({ trim: true })
  firstName?: string;

  @Field({ nullable: true })
  @Prop({ trim: true })
  lastName?: string;

  @Field({ nullable: true })
  @Prop()
  avatar?: string;

  @Field({ nullable: true })
  @Prop()
  bio?: string;

  @Field(() => [UserRole])
  @Prop({ type: [String], enum: UserRole, default: [UserRole.USER] })
  roles: UserRole[];

  @Field()
  @Prop({ default: true })
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
