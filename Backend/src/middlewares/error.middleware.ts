import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  let statusCode = 500;
  let message = 'Error interno del servidor';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  if ((err as any).code === '23505') {
    statusCode = 409;
    message = 'Este registro ya se encuentra en uso por otro proceso';
  }

  if (statusCode >= 500) {
    console.error(`❌ [ERROR FATAL ${statusCode}]:`, err.stack);
  } else {
    console.warn(`⚠️ [ADVERTENCIA ${statusCode}]:`, message);
  }

  res.status(statusCode).json({
    success: false,
    message,
    statusCode
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};