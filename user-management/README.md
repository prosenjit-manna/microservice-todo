# User Management Microservice

Handles user registration, authentication, and profile management for the Todo microservices platform.

## Overview

| Concern | Technology |
|---|---|
| Framework | NestJS (TypeScript) |
| Database | MongoDB (Mongoose) |
| API | GraphQL (Apollo Federation) |
| Auth | JWT (RS256) |
| Inter-service RPC | gRPC |
| Async messaging | RabbitMQ (AMQP) |
| Logging | Winston (file + console) |
| Containerisation | Docker / Docker Compose |

## Ports

| Port | Protocol | Purpose |
|---|---|---|
| `3001` | HTTP | GraphQL API (`/graphql`) |
| `50051` | gRPC | Inter-service RPC (UserService) |

---

## Prerequisites

- Node.js >= 20
- npm >= 10
- MongoDB 7 (local or Docker)
- RabbitMQ 3 (local or Docker)

---

## Local Development (hot-reload)

This is the recommended way to develop. The NestJS CLI watches for file changes and automatically restarts the server.

### 1. Clone and install dependencies

```bash
cd user-management
npm install
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Edit `.env` with your local values (defaults work out of the box when using Docker Compose for dependencies):

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/user-management
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d
RABBITMQ_URL=amqp://localhost:5672
GRPC_URL=0.0.0.0:50051
LOG_DIR=logs
LOG_LEVEL=debug
```

### 3. Start infrastructure dependencies only (MongoDB + RabbitMQ)

If you don't have MongoDB and RabbitMQ running locally, spin them up with Docker Compose while keeping the app running natively for hot-reload:

```bash
docker compose up mongo rabbitmq -d
```

### 4. Start the dev server with hot-reload

```bash
npm run start:dev
```

NestJS uses `@nestjs/cli` under the hood which runs `ts-node` with watch mode. **Every time you save a `.ts` file the server automatically restarts** — no manual restart needed.

You should see output like:

```
[Nest] LOG [NestFactory] Starting Nest application...
User Management Service running on port 3001
gRPC listening on 0.0.0.0:50051
```

### 5. Open the GraphQL Playground

Navigate to [http://localhost:3001/graphql](http://localhost:3001/graphql) in your browser.

---

## Available npm Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | **Hot-reload dev server** — restarts on every file save |
| `npm run start:debug` | Dev server with Node.js debugger attached (port 9229) |
| `npm run start` | Start compiled app (requires `npm run build` first) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm run test` | Unit tests (Jest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:cov` | Unit tests with coverage report |
| `npm run test:e2e` | End-to-end tests (Playwright) |

---

## Docker Compose (full stack)

Runs the service **and** all its dependencies (MongoDB, RabbitMQ) in containers.  
> Note: hot-reload is **not** active in this mode. Use this for integration testing or verifying the production build locally.

```bash
# Build and start everything
docker compose up --build

# Start in background
docker compose up --build -d

# Stop and remove containers
docker compose down

# Stop and also remove volumes (wipes the database)
docker compose down -v
```

### Service URLs when using Docker Compose

| Service | URL |
|---|---|
| GraphQL API | http://localhost:3001/graphql |
| gRPC | `localhost:50051` |
| MongoDB | `mongodb://localhost:27017` |
| RabbitMQ AMQP | `amqp://localhost:5672` |
| RabbitMQ Management UI | http://localhost:15672 (guest / guest) |

---

## GraphQL API Reference

### Public Mutations (no token required)

#### Register a new user

```graphql
mutation Register {
  register(createUserInput: {
    email: "alice@example.com"
    username: "alice"
    password: "Secret123!"
    firstName: "Alice"
    lastName: "Smith"
  }) {
    _id
    email
    username
  }
}
```

#### Login

```graphql
mutation Login {
  login(loginInput: {
    email: "alice@example.com"
    password: "Secret123!"
  }) {
    accessToken
    user {
      _id
      email
      username
    }
  }
}
```

### Protected Queries / Mutations (Bearer token required)

Add the JWT to the HTTP Headers panel in the playground:

```json
{
  "Authorization": "Bearer <your-access-token>"
}
```

#### Get current user profile

```graphql
query Me {
  me {
    _id
    email
    username
    firstName
    lastName
  }
}
```

#### Get all users

```graphql
query Users {
  users {
    _id
    email
    username
  }
}
```

#### Get user by ID

```graphql
query User {
  user(id: "<userId>") {
    _id
    email
    username
  }
}
```

#### Update profile

```graphql
mutation UpdateProfile {
  updateProfile(updateUserInput: {
    firstName: "Alicia"
  }) {
    _id
    firstName
  }
}
```

#### Change password

```graphql
mutation ChangePassword {
  changePassword(changePasswordInput: {
    currentPassword: "Secret123!"
    newPassword: "NewSecret456!"
  }) {
    _id
  }
}
```

---

## gRPC Interface

Defined in [src/proto/user.proto](src/proto/user.proto). Used by other microservices for synchronous inter-service communication.

```protobuf
service UserService {
  rpc GetUser         (GetUserRequest)       returns (UserResponse);
  rpc GetUsersByIds   (GetUsersByIdsRequest) returns (UsersResponse);
  rpc ValidateUser    (ValidateUserRequest)  returns (ValidateUserResponse);
}
```

---

## RabbitMQ Events

The service listens on the `user_queue` queue and publishes the following events:

| Event | Direction | Payload |
|---|---|---|
| `user.created` | Publish | `{ userId, email, username }` |
| `user.updated` | Publish | `{ userId, ...updatedFields }` |
| `user.deleted` | Publish | `{ userId }` |

---

## Project Structure

```
src/
├── app.module.ts              # Root module
├── main.ts                    # Bootstrap (HTTP + gRPC + RabbitMQ)
├── auth/
│   ├── auth.module.ts
│   ├── auth.resolver.ts       # login mutation
│   ├── auth.service.ts        # JWT sign/verify logic
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   ├── dto/
│   │   ├── auth-response.ts
│   │   └── login.input.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
├── common/
│   └── logger/
│       └── winston.logger.ts  # Winston configuration
├── grpc/
│   └── user-grpc.controller.ts
├── proto/
│   └── user.proto
└── users/
    ├── users.module.ts
    ├── users.resolver.ts      # GraphQL resolvers
    ├── users.repository.ts    # MongoDB data access
    ├── users.service.ts       # Business logic
    ├── user-events.service.ts # RabbitMQ event publisher
    ├── dto/
    │   ├── create-user.input.ts
    │   ├── update-user.input.ts
    │   └── change-password.input.ts
    └── schemas/
        └── user.schema.ts     # Mongoose schema / GraphQL type
```

---

## Testing

### Unit tests

```bash
npm run test
```

### Unit tests in watch mode (re-runs on file save)

```bash
npm run test:watch
```

### Coverage report

```bash
npm run test:cov
```

### E2E tests

Make sure the service is running before executing:

```bash
npm run test:e2e
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `NODE_ENV` | `development` | Node environment |
| `MONGODB_URI` | `mongodb://localhost:27017/user-management` | MongoDB connection string |
| `JWT_SECRET` | — | **Required.** Min 32 characters |
| `JWT_EXPIRES_IN` | `7d` | Token expiry (e.g. `7d`, `24h`) |
| `RABBITMQ_URL` | `amqp://localhost:5672` | RabbitMQ connection URL |
| `GRPC_URL` | `0.0.0.0:50051` | gRPC bind address |
| `LOG_DIR` | `logs` | Directory for log files |
| `LOG_LEVEL` | `debug` | Winston log level |

---

## Health Check

```bash
curl http://localhost:3001/health
```

---

## Troubleshooting

**Port already in use**
```bash
lsof -ti:3001 | xargs kill -9
```

**MongoDB connection refused**  
Make sure MongoDB is running: `docker compose up mongo -d`

**RabbitMQ connection refused**  
Make sure RabbitMQ is running: `docker compose up rabbitmq -d`

**`dist/` out of date after pulling changes**  
```bash
npm run build
```
