import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

 
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,               // DTO에 정의되지 않은 속성은 제거
    forbidNonWhitelisted: true,    // 정의되지 않은 속성 요청 시 에러 발생
    transform: true,               // 요청 데이터를 DTO 타입으로 자동 변환
  }));

  // Swagger API 문서 설정
  const config = new DocumentBuilder()
    .setTitle('GIST Vote API')
    .setDescription('GIST Vote API 문서')
    .setVersion('1.0')
    .addBearerAuth() // JWT 인증 버튼 추가
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // http://localhost:3000/api 로 접속 가능

  await app.listen(3000);
}
bootstrap();