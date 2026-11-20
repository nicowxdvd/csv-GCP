import { BadRequestException, StandardSchemaValidationPipe } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export interface ValidationIssue {
  path: string;
  message: string;
}

function formatPath(path: StandardSchemaV1.Issue['path']): string {
  return (path ?? []).map((segment) => String(typeof segment === 'object' ? segment.key : segment)).join('.');

}

export function createSchemaValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) => new BadRequestException({ message: 'Validation failed', errors: issues.map<ValidationIssue>((issue) => ({ path: formatPath(issue.path), message: issue.message })) }),
  });

}
