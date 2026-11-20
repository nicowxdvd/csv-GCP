import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string;
  errors?: unknown;
  path: string;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body: ErrorBody = {
      statusCode,
      message: 'Internal server error',
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        body.message = payload;
      } else {
        const { message, errors } = payload as {
          message?: unknown;
          errors?: unknown;
        };
        body.message = Array.isArray(message)
          ? message.join(', ')
          : typeof message === 'string'
            ? message
            : exception.message;
        if (errors !== undefined) body.errors = errors;
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json(body);
  }
}
