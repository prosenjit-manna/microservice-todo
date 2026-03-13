import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('User Management (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GraphQL - User Registration & Login', () => {
    const testUser = {
      email: 'e2e@example.com',
      username: 'e2euser',
      password: 'testpassword123',
      firstName: 'E2E',
      lastName: 'Test',
    };

    let accessToken: string;

    it('should register a new user', async () => {
      const mutation = `
        mutation {
          register(createUserInput: {
            email: "${testUser.email}"
            username: "${testUser.username}"
            password: "${testUser.password}"
            firstName: "${testUser.firstName}"
            lastName: "${testUser.lastName}"
          }) {
            _id
            email
            username
            firstName
            lastName
            roles
            isActive
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation })
        .expect(200);

      const user = response.body.data?.register;
      expect(user).toBeDefined();
      expect(user.email).toBe(testUser.email);
      expect(user.username).toBe(testUser.username);
      expect(user.isActive).toBe(true);
      expect(user.roles).toContain('user');
    });

    it('should login and return JWT token', async () => {
      const mutation = `
        mutation {
          login(loginInput: {
            emailOrUsername: "${testUser.email}"
            password: "${testUser.password}"
          }) {
            accessToken
            user {
              _id
              email
              username
            }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation })
        .expect(200);

      const auth = response.body.data?.login;
      expect(auth).toBeDefined();
      expect(auth.accessToken).toBeDefined();
      expect(auth.user.email).toBe(testUser.email);

      accessToken = auth.accessToken;
    });

    it('should return current user with valid token', async () => {
      const query = `
        query {
          me {
            _id
            email
            username
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query })
        .expect(200);

      const me = response.body.data?.me;
      expect(me).toBeDefined();
      expect(me.email).toBe(testUser.email);
    });

    it('should reject unauthenticated requests', async () => {
      const query = `
        query {
          me {
            _id
            email
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeDefined();
    });
  });
});
