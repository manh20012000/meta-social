import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { MulterError } from 'multer';
import { Response } from 'express';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let message = 'File upload error';
    let status = HttpStatus.BAD_REQUEST;

    if (exception.code === 'LIMIT_FILE_SIZE') {
      message = 'File is too large. Max size is 1MB';
    } else if (exception.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Too many files uploaded';
    } else {
      message = exception.message;
    }

    response.status(status).json({
      status: false,
      statusCode: status,
      message,
      data: null,
 
    });
  }
}
