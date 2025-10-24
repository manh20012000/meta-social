import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const res = exception.getResponse() as any;

    response.status(status).json({
      statusCode: res.statusCode ?? status,
      status: false,
      message: res.message || 'Internal server error',
      data: null,
      error: res.error ?? null,   
    });
  }
}