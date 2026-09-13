import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);

  const statusCode = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500;

  response.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : error instanceof Error ? error.message : 'Request failed',
    message: process.env.NODE_ENV === 'production' ? undefined : error instanceof Error ? error.message : String(error),
  });
};
