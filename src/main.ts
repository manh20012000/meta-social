import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './configuars/response/filter.exception';
import { ResponseInterceptor } from './configuars/response/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService);


  const prefix = cfg.get<string>('globalPrefix') ?? 'api';
  app.setGlobalPrefix(prefix);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true, // Strip extra fields → gây lỗi rõ nếu có thừa
      forbidNonWhitelisted: true, // Throw nếu thừa
      exceptionFactory: (errors) => {
        console.log('Validation errors:', JSON.stringify(errors, null, 2)); // Giữ log
        const messages = errors
          .map((err) => Object.values(err.constraints || {}))
          .flat();
        return new BadRequestException({
          statusCode: 400,
          message: messages,
          errors: errors,
        });
      },
    }),
  );
  // CORS + Validation
  app.enableCors();
  // Port
  const port = cfg.get<number>('port') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`meta-social listening on :${port} (${prefix})`);
}
bootstrap();
