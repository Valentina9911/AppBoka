import { getClient, query } from '../../config/database';
import { AppError } from '../../utils/AppError';

export class UsuariosService {
  
  static async listarActivos() {
    const resultado = await query(
      `SELECT u.id, u.username, u.nombre_completo, u.activo, u.ultimo_acceso, u.created_at,
              COALESCE(
                json_agg(json_build_object('id', r.id, 'nombre', r.nombre)) FILTER (WHERE r.id IS NOT NULL), '[]'
              ) as roles
       FROM usuarios u 
       LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
       LEFT JOIN roles r ON ur.rol_id = r.id AND r.activo = true
       WHERE u.activo = true 
       GROUP BY u.id
       ORDER BY u.nombre_completo`
    );
    return resultado.rows;
  }

  static async actualizar(id: string, data: any) {
    const { nombre_completo, username } = data;
    const resultado = await query(
      `UPDATE usuarios 
       SET nombre_completo = COALESCE($1, nombre_completo), 
           username = COALESCE($2, username),
           updated_at = NOW()
       WHERE id = $3 RETURNING id, username, nombre_completo, activo`,
      [nombre_completo, username, id]
    );
    return resultado.rows[0];
  }

  static async eliminar(id: string) {
    const resultado = await query(`UPDATE usuarios SET activo = false WHERE id = $1 RETURNING id`, [id]);
    return resultado.rows[0];
  }

  static async actualizarRolesUsuario(usuarioId: string, rolIds: string[]) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM usuario_roles WHERE usuario_id = $1', [usuarioId]);
      
      for (const rolId of rolIds) {
        if (rolId) {
          await client.query('INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2)', [usuarioId, rolId]);
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async listarRoles() {
    const resultado = await query(`SELECT id, nombre, descripcion, es_sistema FROM roles WHERE activo = true ORDER BY es_sistema DESC, nombre`);
    return resultado.rows;
  }

  static async crearRol(data: any) {
    const { nombre, descripcion } = data;
    const resultado = await query(
      `INSERT INTO roles (nombre, descripcion, es_sistema) VALUES ($1, $2, false) RETURNING *`,
      [nombre, descripcion || null]
    );
    return resultado.rows[0];
  }

  static async listarPermisos() {
    const resultado = await query(`SELECT id, codigo, modulo, descripcion FROM permisos ORDER BY modulo, codigo`);
    return resultado.rows;
  }

  static async obtenerPermisosRol(rolId: string) {
    const resultado = await query(`SELECT permiso_id FROM rol_permisos WHERE rol_id = $1`, [rolId]);
    return resultado.rows.map(r => r.permiso_id);
  }

  static async actualizarPermisosRol(rolId: string, permisosIds: string[]) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      const rolRes = await client.query('SELECT es_sistema, nombre FROM roles WHERE id = $1', [rolId]);
      if (rolRes.rows.length > 0 && rolRes.rows[0].nombre === 'Super Admin') {
        throw new AppError('No se pueden modificar los permisos del Super Admin', 403);
      }

      await client.query('DELETE FROM rol_permisos WHERE rol_id = $1', [rolId]);
      
      for (const permisoId of permisosIds) {
        await client.query('INSERT INTO rol_permisos (rol_id, permiso_id) VALUES ($1, $2)', [rolId, permisoId]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}