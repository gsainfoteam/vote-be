import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
    transform: true,            // Auto-transform to DTO types
  }));

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
  });

  // Swagger API Docs at /docs
  const config = new DocumentBuilder()
    .setTitle('GIST Vote API')
    .setDescription('GIST 투표/설문 서비스 백엔드 API 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
  console.log('🚀 Server running on http://localhost:3000');
  console.log('📖 Swagger Docs: http://localhost:3000/docs');
}
bootstrap();