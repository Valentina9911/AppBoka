
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { Usuario, LoginDTO } from '../../types';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_cambiar';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export class AuthService {
  /**
   * Autentica un usuario con username y password.
   * Retorna un token JWT si las credenciales son válidas.
   */
  static async login(dto: LoginDTO): Promise<{ token: string; usuario: Omit<Usuario, 'password_hash' | 'pin_rapido'> }> {
    const resultado = await query(
      'SELECT * FROM usuarios WHERE username = $1 AND activo = TRUE',
      [dto.username]
    );

    if (resultado.rows.length === 0) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const usuario: Usuario = resultado.rows[0];

    const passwordValido = await bcrypt.compare(dto.password, usuario.password_hash);
    if (!passwordValido) {
      throw new AppError('Credenciales inválidas', 401);
    }

    await query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      [usuario.id]
    );

    const rolesResult = await query(
      `SELECT r.nombre FROM roles r
       JOIN usuario_roles ur ON r.id = ur.rol_id
       WHERE ur.usuario_id = $1 AND r.activo = TRUE`,
      [usuario.id]
    );
    const roles = rolesResult.rows.map((r: any) => r.nombre);

    const payload = {
      id: usuario.id,
      username: usuario.username,
      nombre_completo: usuario.nombre_completo,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const { password_hash, pin_rapido, ...usuarioSeguro } = usuario;
    return {
      token,
      usuario: { ...usuarioSeguro, roles } as any,
    };
  }

  /**
   * Registra un nuevo usuario en el sistema.
   * Solo debe ser llamado por un administrador (la ruta verifica el permiso).
   */
  static async registrar(
    username: string,
    password: string,
    nombre_completo: string,
    email?: string,
    telefono?: string,
    rolIds?: string[]
  ): Promise<Omit<Usuario, 'password_hash' | 'pin_rapido'>> {
    const existente = await query(
      'SELECT id FROM usuarios WHERE username = $1',
      [username]
    );
    if (existente.rows.length > 0) {
      throw new AppError(`El username "${username}" ya está en uso`, 409);
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const resultado = await query(
      `INSERT INTO usuarios (username, password_hash, nombre_completo, email, telefono)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [username, password_hash, nombre_completo, email || null, telefono || null]
    );

    const nuevoUsuario = resultado.rows[0];

    if (rolIds && rolIds.length > 0) {
      for (const rolId of rolIds) {
        await query(
          'INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2)',
          [nuevoUsuario.id, rolId]
        );
      }
    }

    const { password_hash: _, pin_rapido: __, ...usuarioSeguro } = nuevoUsuario;
    return usuarioSeguro;
  }

  /**
   * Obtiene el perfil del usuario autenticado con sus permisos.
   */
  static async obtenerPerfil(usuarioId: string) {
    const resultado = await query(
      `SELECT id, username, email, nombre_completo, telefono, ultimo_acceso, created_at
       FROM usuarios WHERE id = $1 AND activo = TRUE`,
      [usuarioId]
    );

    if (resultado.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const rolesResult = await query(
      `SELECT r.id, r.nombre FROM roles r
       JOIN usuario_roles ur ON r.id = ur.rol_id
       WHERE ur.usuario_id = $1 AND r.activo = TRUE`,
      [usuarioId]
    );

    const permisosResult = await query(
      `SELECT DISTINCT permiso_codigo, permiso_modulo
       FROM vw_permisos_usuario WHERE usuario_id = $1`,
      [usuarioId]
    );

    return {
      ...resultado.rows[0],
      roles: rolesResult.rows,
      permisos: permisosResult.rows,
    };
  }
}
