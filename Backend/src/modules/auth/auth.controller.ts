
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthRequest, LoginDTO, ApiResponse } from '../../types';
import { AppError } from '../../utils/AppError';

export class AuthController {
  /**
   * POST /api/auth/login
   * Autentica al usuario y devuelve un token JWT.
   */
  static async login(req: Request, res: Response): Promise<void> {
    const { username, password }: LoginDTO = req.body;

    if (!username || !password) {
      throw new AppError('Username y password son requeridos', 400);
    }

    const resultado = await AuthService.login({ username, password });

    const response: ApiResponse = {
      success: true,
      message: 'Inicio de sesión exitoso',
      data: resultado,
      statusCode: 200,
    };

    res.status(200).json(response);
  }

  /**
   * POST /api/auth/registrar
   * Registra un nuevo usuario. Requiere permiso usuarios:crear.
   */
  static async registrar(req: Request, res: Response): Promise<void> {
    const { username, password, nombre_completo, email, telefono, rol_ids } = req.body;

    if (!username || !password || !nombre_completo) {
      throw new AppError('username, password y nombre_completo son requeridos', 400);
    }

    if (password.length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    }

    const usuario = await AuthService.registrar(
      username, password, nombre_completo, email, telefono, rol_ids
    );

    const response: ApiResponse = {
      success: true,
      message: 'Usuario registrado exitosamente',
      data: usuario,
      statusCode: 201,
    };

    res.status(201).json(response);
  }

  /**
   * GET /api/auth/perfil
   * Obtiene los datos del usuario autenticado con sus roles y permisos.
   */
  static async perfil(req: AuthRequest, res: Response): Promise<void> {
    if (!req.usuario) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const perfil = await AuthService.obtenerPerfil(req.usuario.id);

    const response: ApiResponse = {
      success: true,
      message: 'Perfil obtenido exitosamente',
      data: perfil,
      statusCode: 200,
    };

    res.status(200).json(response);
  }
}
