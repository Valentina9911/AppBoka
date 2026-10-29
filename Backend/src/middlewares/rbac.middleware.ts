
import { Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { AppError } from '../utils/AppError';

/**
 * Middleware factory de autorización RBAC.
 * @param permisoRequerido - Código del permiso requerido (ej: "ventas:crear")
 * @returns Middleware de Express que valida el permiso
 *
 * @example
 * router.post('/ventas', autenticar, autorizar('ventas:crear'), ventasController.crear);
 */
export const autorizar = (permisoRequerido: string) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.usuario) {
        throw new AppError('Usuario no autenticado', 401);
      }

      const resultado = await query(
        `SELECT 1
         FROM vw_permisos_usuario
         WHERE usuario_id = $1
           AND permiso_codigo = $2
         LIMIT 1`,
        [req.usuario.id, permisoRequerido]
      );

      if (resultado.rows.length === 0) {
        throw new AppError(
          `Acceso denegado. No tiene el permiso: "${permisoRequerido}"`,
          403
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      next(new AppError('Error al verificar permisos de autorización', 500, false));
    }
  };
};
