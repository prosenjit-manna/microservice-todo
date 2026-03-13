# Task Management Microservice

Handles the full lifecycle of tasks: creation, reading, updating, deletion, assignment, and status tracking.

## Stack

| Concern | Technology |
|---|---|
| Language | TypeScript |
| Framework | NestJS 10 |
| API | GraphQL (code-first, Apollo Federation ready) |
| Database | MongoDB via Mongoose |
| Auth | JWT (validates tokens issued by the User Management service) |
| Inter-service messaging | RabbitMQ (AMQP) |
| Inter-service sync calls | gRPC |
| Logging | Winston (file + console) |
| Containerisation | Docker / Docker Compose |

## Port map

| Protocol | Port (local) | Port (container) |
|---|---|---|
| HTTP / GraphQL | `3002` | `3002` |
| gRPC | `50053` | `50052` |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3002` | HTTP port |
| `NODE_ENV` | `development` | |
| `MONGODB_URI` | `mongodb://localhost:27017/task-management` | MongoDB connection string |
| `JWT_SECRET` | — | **Must match** the User Management service secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `RABBITMQ_URL` | `amqp://localhost:5672` | RabbitMQ connection URL |
| `GRPC_URL` | `0.0.0.0:50052` | gRPC bind address |
| `GRPC_ENABLED` | `false` | Set to `true` to enable the gRPC server |
| `LOG_DIR` | `logs` | Directory for log files |
| `LOG_LEVEL` | `debug` | Winston log level |

## Local development

### Prerequisites

- Node.js ≥ 20
- MongoDB running on `localhost:27017`
- RabbitMQ running on `localhost:5672`

### Install dependencies

```bash
cd task-management
npm install
```

### Create `.env`

```env
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/task-management
JWT_SECRET=dev-secret-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d
RABBITMQ_URL=amqp://localhost:5672
GRPC_ENABLED=false
LOG_DIR=logs
LOG_LEVEL=debug
```

### Start in watch mode

```bash
npm run start:dev
```

Open the GraphQL playground at <http://localhost:3002/graphql>.

## Running with Docker Compose

```bash
cd task-management
docker compose up --build
```

This starts:
- `task-management` service (port 3002, gRPC 50053)
- `task-management-mongo` MongoDB (port 27018)
- `task-management-rabbitmq` RabbitMQ (AMQP 5673, UI 15673)

## GraphQL API

All queries and mutations (except health-check) require a valid Bearer JWT token in the `Authorization` header.

### Mutations

| Mutation | Description |
|---|---|
| `createTask(createTaskInput)` | Create a new task |
| `updateTask(id, updateTaskInput)` | Update task details (creator only) |
| `deleteTask(id)` | Soft-delete a task (creator only) |
| `assignTask(assignTaskInput)` | Assign / unassign a task (creator only) |
| `updateTaskStatus(updateTaskStatusInput)` | Change task status (creator or assignee) |

### Queries

| Query | Description |
|---|---|
| `tasks(filters?)` | List all active tasks with optional filters |
| `task(id)` | Get a single task by ID |
| `myTasks(filters?)` | Tasks created by the current user |
| `assignedTasks(filters?)` | Tasks assigned to the current user |

### Enums

**TaskStatus**: `todo` · `in_progress` · `completed` · `cancelled`

**TaskPriority**: `low` · `medium` · `high` · `critical`

### Example – create a task

```graphql
mutation {
  createTask(createTaskInput: {
    title: "Design database schema"
    description: "Create ERD for the orders module"
    priority: HIGH
    dueDate: "2026-06-01T00:00:00Z"
    tags: ["backend", "database"]
  }) {
    _id
    title
    status
    priority
    creatorId
    createdAt
  }
}
```

### Example – assign a task

```graphql
mutation {
  assignTask(assignTaskInput: {
    taskId: "66a1b2c3d4e5f6a7b8c9d0e1"
    assigneeId: "66a1b2c3d4e5f6a7b8c9d0e2"
  }) {
    _id
    title
    assigneeId
  }
}
```

### Example – update status

```graphql
mutation {
  updateTaskStatus(updateTaskStatusInput: {
    taskId: "66a1b2c3d4e5f6a7b8c9d0e1"
    status: IN_PROGRESS
  }) {
    _id
    status
  }
}
```

### Example – list my tasks filtered by status

```graphql
query {
  myTasks(filters: { status: IN_PROGRESS, priority: HIGH }) {
    _id
    title
    status
    priority
    dueDate
    assigneeId
  }
}
```

## gRPC API

Set `GRPC_ENABLED=true` to expose the gRPC server. The proto file is at `src/proto/task.proto`.

| RPC | Request | Response |
|---|---|---|
| `GetTask` | `{ id }` | `TaskResponse` |
| `GetTasksByAssignee` | `{ assigneeId }` | `TasksResponse` |
| `GetTasksByCreator` | `{ creatorId }` | `TasksResponse` |
| `GetTasksByIds` | `{ ids[] }` | `TasksResponse` |

## RabbitMQ events published

| Event | Payload |
|---|---|
| `task.created` | id, title, status, priority, creatorId, assigneeId, dueDate, tags, createdAt |
| `task.updated` | id, title, status, priority, assigneeId, updatedAt |
| `task.deleted` | id |
| `task.assigned` | id, title, assigneeId (null if unassigned), creatorId |
| `task.statusChanged` | id, title, status, assigneeId, creatorId |

## Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:cov

# E2E tests (requires MongoDB + RabbitMQ)
npm run test:e2e
```

## Project structure

```
src/
├── app.module.ts          # Root NestJS module
├── main.ts                # Bootstrap (HTTP + gRPC + RabbitMQ)
├── auth/
│   ├── auth.module.ts
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
├── common/
│   └── logger/
│       └── winston.logger.ts
├── grpc/
│   └── task-grpc.controller.ts
├── proto/
│   └── task.proto
└── tasks/
    ├── dto/
    │   ├── assign-task.input.ts
    │   ├── create-task.input.ts
    │   ├── task-filters.input.ts
    │   ├── update-task-status.input.ts
    │   └── update-task.input.ts
    ├── schemas/
    │   └── task.schema.ts
    ├── task-events.service.ts
    ├── tasks.module.ts
    ├── tasks.repository.ts
    ├── tasks.resolver.ts
    ├── tasks.service.spec.ts
    └── tasks.service.ts
```
