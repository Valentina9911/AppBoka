import { query } from '../../config/database';
import { MesaEstado } from '../../types';
import { AppError } from '../../utils/AppError';

export class MesasService {
  static async listarConEstado(): Promise<MesaEstado[]> {
    const resultado = await query(`SELECT * FROM vw_mesas_estado ORDER BY id`);
    return resultado.rows;
  }

  static async listarPorEstado(estado: string): Promise<MesaEstado[]> {
    const resultado = await query(`SELECT * FROM vw_mesas_estado WHERE estado = $1 ORDER BY nombre`, [estado]);
    return resultado.rows;
  }

  static async obtenerPorId(id: number): Promise<MesaEstado | null> {
    const resultado = await query('SELECT * FROM vw_mesas_estado WHERE id = $1', [id]);
    return resultado.rows[0] || null;
  }

  static async cambiarEstado(id: number, estado: string): Promise<MesaEstado> {
    const estadosValidos = ['disponible', 'ocupada', 'reservada', 'mantenimiento'];
    if (!estadosValidos.includes(estado)) {
      throw new AppError(`Estado inválido. Use: ${estadosValidos.join(', ')}`, 400);
    }

    await query('UPDATE mesas SET estado = $1 WHERE id = $2 AND activo = TRUE', [estado, id]);
    const resultado = await query('SELECT * FROM vw_mesas_estado WHERE id = $1', [id]);
    if (resultado.rows.length === 0) throw new AppError('Mesa no encontrada', 404);

    return resultado.rows[0];
  }

  static async crear(data: any) {
    const { nombre, capacidad, ubicacion } = data;
    const resultado = await query(
      `INSERT INTO mesas (nombre, capacidad, ubicacion) VALUES ($1, $2, $3) RETURNING *`,
      [nombre, capacidad || 4, ubicacion || null]
    );
    return resultado.rows[0];
  }

  static async actualizar(id: number, data: any) {
    const { nombre, capacidad, ubicacion, estado } = data;
    const resultado = await query(
      `UPDATE mesas 
       SET nombre = COALESCE($1, nombre), 
           capacidad = COALESCE($2, capacidad), 
           ubicacion = COALESCE($3, ubicacion), 
           estado = COALESCE($4, estado), 
           updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
      [nombre, capacidad, ubicacion, estado, id]
    );
    return resultado.rows[0];
  }

  static async eliminar(id: number) {
    await query(`UPDATE mesas SET activo = FALSE, updated_at = NOW() WHERE id = $1`, [id]);
  }
}