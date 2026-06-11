import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttpRequest = exception instanceof HttpException;
    const statusCode = isHttpRequest
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpRequest ? exception.getResponse() : null;

    const message = this.extractMessage(exceptionResponse);

    const logMessage = `${req.method} ${req.url} — ${statusCode}`;
    if (statusCode >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(`${logMessage} — ${JSON.stringify(message)}`);
    }

    res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }

  private extractMessage(
    exceptionResponse: string | object | null,
  ): string | string[] {
    if (!exceptionResponse) return 'Internal Server Error';
    if (typeof exceptionResponse === 'string') return exceptionResponse;
    if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      return (exceptionResponse as { message: string | string[] }).message;
    }
    return 'Internal server error';
  }
}
