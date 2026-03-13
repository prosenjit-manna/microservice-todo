import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Task Management (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let createdTaskId: string;

  // A valid JWT signed with the same secret configured in the test env.
  // In CI, set JWT_SECRET and issue a real token, or use a test helper.
  const testUserId = 'test-user-id-e2e';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Obtain a JWT from the user-management service or sign one locally
    // for e2e tests (requires JWT_SECRET env var to match).
    const { JwtService } = await import('@nestjs/jwt');
    const jwtService = app.get(JwtService);
    accessToken = jwtService.sign(
      { sub: testUserId, email: 'e2e@example.com' },
      { secret: process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars' },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Task CRUD ──────────────────────────────────────────────────────────

  describe('GraphQL – Task lifecycle', () => {
    it('should create a task', async () => {
      const mutation = `
        mutation {
          createTask(createTaskInput: {
            title: "E2E Test Task"
            description: "Created during e2e testing"
            priority: HIGH
            tags: ["e2e", "test"]
          }) {
            _id
            title
            status
            priority
            creatorId
            isActive
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: mutation })
        .expect(200);

      const task = response.body.data?.createTask;
      expect(task).toBeDefined();
      expect(task.title).toBe('E2E Test Task');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('high');
      expect(task.creatorId).toBe(testUserId);
      expect(task.isActive).toBe(true);

      createdTaskId = task._id;
    });

    it('should query the created task by id', async () => {
      const query = `
        query {
          task(id: "${createdTaskId}") {
            _id
            title
            status
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query })
        .expect(200);

      const task = response.body.data?.task;
      expect(task).toBeDefined();
      expect(task._id).toBe(createdTaskId);
    });

    it('should list tasks created by the current user', async () => {
      const query = `
        query {
          myTasks {
            _id
            title
            creatorId
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query })
        .expect(200);

      const tasks = response.body.data?.myTasks;
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.some((t) => t._id === createdTaskId)).toBe(true);
    });

    it('should update task status', async () => {
      const mutation = `
        mutation {
          updateTaskStatus(updateTaskStatusInput: {
            taskId: "${createdTaskId}"
            status: IN_PROGRESS
          }) {
            _id
            status
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: mutation })
        .expect(200);

      const task = response.body.data?.updateTaskStatus;
      expect(task.status).toBe('in_progress');
    });

    it('should update a task', async () => {
      const mutation = `
        mutation {
          updateTask(
            id: "${createdTaskId}"
            updateTaskInput: { title: "Updated E2E Task" }
          ) {
            _id
            title
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: mutation })
        .expect(200);

      expect(response.body.data?.updateTask.title).toBe('Updated E2E Task');
    });

    it('should delete the task', async () => {
      const mutation = `
        mutation {
          deleteTask(id: "${createdTaskId}") {
            _id
            isActive
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: mutation })
        .expect(200);

      const task = response.body.data?.deleteTask;
      expect(task.isActive).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      const query = `query { tasks { _id } }`;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeDefined();
    });
  });
});
