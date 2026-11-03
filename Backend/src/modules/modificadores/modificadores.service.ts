import { query, getClient } from '../../config/database'; // 🔥 CORRECCIÓN: Importamos getClient
import { AppError } from '../../utils/AppError';

export class ModificadoresService {
  
  static async crearGrupo(data: { nombre: string, min_selecciones: number, max_selecciones: number }) {
    const result = await query(
      `INSERT INTO modificador_grupos (nombre, min_selecciones, max_selecciones) 
       VALUES ($1, $2, $3) RETURNING *`,
      [data.nombre, data.min_selecciones, data.max_selecciones]
    );
    return result.rows[0];
  }

  static async obtenerGrupos() {
    const result = await query(
      `SELECT mg.*, 
        COALESCE(
          json_agg(
            json_build_object('id', m.id, 'nombre', m.nombre, 'precio_extra', m.precio_extra, 'activo', m.activo)
          ) FILTER (WHERE m.id IS NOT NULL), '[]'
        ) as modificadores
       FROM modificador_grupos mg
       LEFT JOIN modificadores m ON mg.id = m.grupo_id AND m.activo = true
       WHERE mg.activo = true
       GROUP BY mg.id
       ORDER BY mg.created_at DESC`
    );
    return result.rows;
  }

  static async eliminarGrupo(id: string) {
    await query(`UPDATE modificador_grupos SET activo = false WHERE id = $1`, [id]);
    return { message: 'Grupo eliminado correctamente' };
  }

  static async agregarModificador(grupoId: string, data: { nombre: string, precio_extra: number }) {
    const result = await query(
      `INSERT INTO modificadores (grupo_id, nombre, precio_extra) 
       VALUES ($1, $2, $3) RETURNING *`,
      [grupoId, data.nombre, data.precio_extra || 0]
    );
    return result.rows[0];
  }

  static async eliminarModificador(id: string) {
    await query(`UPDATE modificadores SET activo = false WHERE id = $1`, [id]);
    return { message: 'Modificador eliminado correctamente' };
  }

  static async vincularGruposAProducto(productoId: string, gruposIds: string[]) {
    const client = await getClient(); // 🔥 CORRECCIÓN: Usamos getClient() para la transacción
    try {
      await client.query('BEGIN');

      await client.query(`DELETE FROM producto_modificadores WHERE producto_id = $1`, [productoId]);

      if (gruposIds && gruposIds.length > 0) {
        const insertPromises = gruposIds.map(grupoId => {
          return client.query(
            `INSERT INTO producto_modificadores (producto_id, grupo_id) VALUES ($1, $2)`,
            [productoId, grupoId]
          );
        });
        await Promise.all(insertPromises);
      }

      await client.query('COMMIT');
      return { message: 'Grupos vinculados al producto exitosamente' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async obtenerVinculosProducto(productoId: string) {
    const result = await query(
      'SELECT grupo_id FROM producto_modificadores WHERE producto_id = $1', 
      [productoId]
    );
    return result.rows.map(row => row.grupo_id);
  }
}