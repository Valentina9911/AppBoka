
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, UsuarioAuth } from '../types';
import { AppError } from '../utils/AppError';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_cambiar';

/**
 * Middleware que valida el token JWT de la sesión.
 * Debe colocarse ANTES de cualquier ruta protegida.
 */
export const autenticar = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticación no proporcionado. Use el header Authorization: Bearer <token>', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Formato de token inválido', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET) as UsuarioAuth;

    req.usuario = {
      id: decoded.id,
      username: decoded.username,
      nombre_completo: decoded.nombre_completo,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('El token ha expirado. Inicie sesión nuevamente.', 401));
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Token inválido o manipulado.', 401));
      return;
    }
    next(new AppError('Error de autenticación', 401));
  }
};
