import {
  type ArgumentsHost,
  Catch,
  ConflictException,
  type ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { HttpExceptionFilter } from './http-exception.filter.js';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly httpFilter = new HttpExceptionFilter();

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    switch (exception.code) {
      case 'P2002':
        return this.httpFilter.catch(
          new ConflictException('Resource already exists'),
          host,
        );
      case 'P2025':
        return this.httpFilter.catch(
          new NotFoundException('Resource not found'),
          host,
        );
      default:
        return this.httpFilter.catch(exception, host);
    }
  }
}
