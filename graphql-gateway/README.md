# GraphQL Gateway

Apollo Federation v2 gateway that stitches all subgraph schemas into a **single GraphQL playground** accessible at `http://localhost:4000/graphql`.

## Architecture

```
Client
  │
  ▼
GraphQL Gateway  :4000   ← single entry point / playground
  ├── User Management  :3001/graphql   (Federation subgraph)
  └── Task Management  :3002/graphql   (Federation subgraph)
```

The gateway uses **`IntrospectAndCompose`** to fetch and merge the subgraph schemas at startup, then re-polls every 30 s so schema changes are applied automatically without restarting.

Every incoming request's headers (`Authorization`, `x-user-id`, `x-user-email`, `x-request-id`) are forwarded to each subgraph via `AuthenticatedDataSource`.

## Port map

| Service | Port |
|---|---|
| GraphQL Gateway (playground) | `4000` |
| User Management subgraph | `3001` |
| Task Management subgraph | `3002` |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `NODE_ENV` | `development` | Enables playground when not `production` |
| `USER_MANAGEMENT_URL` | `http://localhost:3001/graphql` | User Management subgraph URL |
| `TASK_MANAGEMENT_URL` | `http://localhost:3002/graphql` | Task Management subgraph URL |
| `LOG_DIR` | `logs` | Log file directory |
| `LOG_LEVEL` | `debug` | Winston log level |

## Local development (all services via Docker Compose)

```bash
cd graphql-gateway
docker compose up --build
```

This starts:
- `graphql-gateway` on port **4000**
- `user-management` on port **3001** + its own MongoDB
- `task-management` on port **3002** + its own MongoDB
- Shared RabbitMQ (AMQP 5672, management UI 15672)

Open the unified playground at **<http://localhost:4000/graphql>**.

## Running the gateway standalone (subgraphs already running)

```bash
cd graphql-gateway
cp .env.example .env   # or edit .env directly
npm install
npm run start:dev
```

## Example – unified query across subgraphs

```graphql
# Auth: pass the JWT from user-management as Bearer token.
# The gateway forwards it to each subgraph as-is.

query Dashboard {
  me {
    _id
    username
    email
  }
  myTasks(filters: { status: IN_PROGRESS }) {
    _id
    title
    priority
    dueDate
  }
}
```

## How federation works

### Subgraphs
Each service (`user-management`, `task-management`) runs as an **Apollo Federation v2 subgraph**:
- `ApolloFederationDriver` is used instead of `ApolloDriver`
- Key entities are annotated with `@key(fields: "_id")` via `@Directive`
- Each resolver class exposes a `@ResolveReference()` method so the gateway can hydrate entities by key

### Gateway
- `ApolloGatewayDriver` with `IntrospectAndCompose` composes the supergraph SDL at runtime
- `AuthenticatedDataSource` forwards identity headers to every subgraph
- No schema SDL files are committed — everything is introspected live

## Adding a new subgraph

1. Build the new service with `ApolloFederationDriver` and `@key` directives.
2. Add it to the `subgraphs` array in [src/app.module.ts](src/app.module.ts):
   ```ts
   { name: 'notification', url: configService.get('NOTIFICATION_URL') }
   ```
3. Add the corresponding env var to `.env` / docker-compose.

## Project structure

```
src/
├── app.module.ts          # Gateway module (IntrospectAndCompose config)
├── main.ts                # Bootstrap
└── common/
    └── logger/
        └── winston.logger.ts
```
