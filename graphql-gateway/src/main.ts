import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { winstonConfig } from './common/logger/winston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  app.enableCors();

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`GraphQL Gateway running on http://localhost:${port}/graphql`);
}

bootstrap();
