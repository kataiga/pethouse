import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type {
  Request, Response,
} from 'express';
import { ErrorResponseDto } from '@common/dto/error-response.dto';

interface DescribedException {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
}

const VALIDATION_SUMMARY = 'Validation failed';
const INTERNAL_ERROR = 'Internal Server Error';

/** `SERVICE_UNAVAILABLE` -> `Service Unavailable`, matching the `error` field Nest itself emits. */
function reasonPhrase (statusCode: number): string {
  const name = HttpStatus[statusCode];

  if (typeof name !== 'string') {
    return INTERNAL_ERROR;
  }

  return name
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray (value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Reduces whatever Nest throws to the shape of ErrorResponseDto. Built-in HttpExceptions carry
 * `{ statusCode, message, error }`; the ValidationPipe puts one string per violated constraint in
 * `message`, which becomes `details` behind a fixed summary.
 */
export function describeException (exception: unknown): DescribedException {
  if (!(exception instanceof HttpException)) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: INTERNAL_ERROR,
      message: INTERNAL_ERROR,
    };
  }

  const statusCode = exception.getStatus();
  const body = exception.getResponse();

  if (typeof body === 'string') {
    return {
      statusCode,
      error: reasonPhrase(statusCode),
      message: body,
    };
  }

  if (!isRecord(body)) {
    return {
      statusCode,
      error: reasonPhrase(statusCode),
      message: exception.message,
    };
  }

  const error = typeof body.error === 'string' ? body.error : reasonPhrase(statusCode);

  if (isStringArray(body.message)) {
    return {
      statusCode,
      error,
      message: VALIDATION_SUMMARY,
      details: body.message,
    };
  }

  return {
    statusCode,
    error,
    message: typeof body.message === 'string' ? body.message : exception.message,
  };
}

/** Global filter: every error leaves the API as an ErrorResponseDto. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch (exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const described = describeException(exception);

    if (described.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${request.method} ${request.url} -> ${described.statusCode}`, stack);
    }

    response.status(described.statusCode).json(new ErrorResponseDto({
      ...described,
      path: request.url,
    }));
  }
}
