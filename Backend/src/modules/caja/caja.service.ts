import { getClient, query } from '../../config/database';
import { AppError } from '../../utils/AppError';

export class CajaService {
  static async abrirTurno(usuarioId: string, monto_apertura: number, caja_id: number) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const cajaOcupada = await client.query('SELECT id FROM turnos_caja WHERE caja_id = $1 AND abierto = true', [caja_id]);
      if (cajaOcupada.rows.length > 0) throw new AppError('Esta caja ya tiene un turno abierto.', 409);

      const result = await client.query(
        `INSERT INTO turnos_caja (caja_id, usuario_id, monto_apertura) VALUES ($1, $2, $3) RETURNING *`,
        [caja_id, usuarioId, monto_apertura]
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  static async obtenerCajas() {
    const result = await query('SELECT * FROM cajas WHERE activo = true ORDER BY id ASC');
    return result.rows;
  }

  private static async adjuntarDetallesAlTurno(turno: any) {
    turno.total_propina = 0;
    turno.total_descuento = 0;
    const movsRes = await query('SELECT tipo,monto,descripcion FROM movimientos_caja WHERE turno_caja_id=$1 ORDER BY created_at', [turno.turno_id]);
    turno.movimientos_detalle = movsRes.rows;
    turno.productos_detalle = [];
    return turno;
  }
  static async obtenerTurnoActual(usuarioId: string) {
    const turnoRes = await query('SELECT * FROM vw_resumen_turno WHERE usuario_id = $1 AND abierto = TRUE LIMIT 1', [usuarioId]);
    if (turnoRes.rows.length === 0) return null;
    return await this.adjuntarDetallesAlTurno(turnoRes.rows[0]);
  }

  static async registrarMovimiento(usuarioId: string, tipo: 'ingreso' | 'egreso', monto: number, descripcion: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const turnoRes = await client.query('SELECT id FROM turnos_caja WHERE usuario_id = $1 AND abierto = TRUE', [usuarioId]);
      if (turnoRes.rows.length === 0) throw new AppError('No tienes un turno de caja abierto.', 404);

      const movRes = await client.query(
        `INSERT INTO movimientos_caja (turno_caja_id, usuario_id, tipo, monto, descripcion) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [turnoRes.rows[0].id, usuarioId, tipo, monto, descripcion]
      );
      await client.query('COMMIT');
      return movRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async cerrarTurno(usuarioId: string, montoCierreReal: number, notasCierre?: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const lockTurno = await client.query('SELECT id FROM turnos_caja WHERE usuario_id = $1 AND abierto = TRUE FOR UPDATE', [usuarioId]);
      if (lockTurno.rows.length === 0) throw new AppError('No tienes un turno abierto para cerrar.', 404);

      const turnoRes = await client.query('SELECT * FROM vw_resumen_turno WHERE usuario_id = $1 AND abierto = TRUE LIMIT 1', [usuarioId]);
      let turno = turnoRes.rows[0];
      
      turno = await this.adjuntarDetallesAlTurno(turno);

      const montoCierreSistema = Number(turno.monto_apertura) + Number(turno.total_efectivo) + Number(turno.total_ingresos_extra) - Number(turno.total_egresos);

      const updateRes = await client.query(
        `UPDATE turnos_caja SET abierto = FALSE, fecha_cierre = NOW(), monto_cierre_sistema = $1, monto_cierre_real = $2, notas_cierre = $3 WHERE id = $4 RETURNING *`,
        [montoCierreSistema, montoCierreReal, notasCierre || null, turno.turno_id]
      );

      await client.query('COMMIT');

      turno.abierto = false;
      turno.fecha_cierre = updateRes.rows[0].fecha_cierre;
      turno.monto_cierre_real = montoCierreReal;
      turno.monto_cierre_sistema = montoCierreSistema;
      turno.diferencia = montoCierreReal - montoCierreSistema;

      return turno;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async obtenerHistorialCierres(limite: number = 20) {
    const result = await query(`
      SELECT tc.*, c.nombre as caja_nombre, u.nombre_completo as cajero_nombre
      FROM turnos_caja tc
      LEFT JOIN cajas c ON tc.caja_id = c.id
      JOIN usuarios u ON tc.usuario_id = u.id
      WHERE tc.abierto = FALSE
      ORDER BY tc.fecha_cierre DESC
      LIMIT $1
    `, [limite]);
    return result.rows;
  }

  static async reconstruirTurnoCerrado(turnoId: string) {
    const r = await query('SELECT v.*,tc.monto_cierre_sistema,tc.monto_cierre_real,tc.notas_cierre,tc.diferencia,u.nombre_completo AS cajero_nombre FROM vw_resumen_turno v JOIN turnos_caja tc ON tc.id=v.turno_id JOIN usuarios u ON u.id=v.usuario_id WHERE v.turno_id=$1', [turnoId]);
    if (!r.rows.length) throw new AppError('Turno no encontrado',404);
    return this.adjuntarDetallesAlTurno(r.rows[0]);
  }
}