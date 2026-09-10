import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);

  response.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? undefined : error instanceof Error ? error.message : String(error),
  });
};
