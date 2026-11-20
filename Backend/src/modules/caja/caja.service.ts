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
    const extrasRes = await query(
      `SELECT COALESCE(SUM(propina), 0) as total_propina, COALESCE(SUM(descuento), 0) as total_descuento 
       FROM ventas WHERE turno_caja_id = $1 AND anulada = FALSE`, [turno.turno_id]
    );
    turno.total_propina = Number(extrasRes.rows[0].total_propina);
    turno.total_descuento = Number(extrasRes.rows[0].total_descuento);

    const movsRes = await query(`SELECT tipo, monto, descripcion FROM movimientos_caja WHERE turno_caja_id = $1 ORDER BY created_at ASC`, [turno.turno_id]);
    turno.movimientos_detalle = movsRes.rows;

    const prodsRes = await query(
      `SELECT p.nombre, SUM(ci.cantidad) as cantidad, SUM(ci.subtotal - ci.descuento) as total 
       FROM cuenta_items ci 
       JOIN ventas v ON ci.cuenta_id = v.cuenta_id 
       JOIN productos p ON ci.producto_id = p.id 
       WHERE v.turno_caja_id = $1 AND v.anulada = FALSE AND ci.estado != 'cancelado' 
       GROUP BY p.id, p.nombre 
       ORDER BY cantidad DESC`, [turno.turno_id]
    );
    turno.productos_detalle = prodsRes.rows;

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

  static async reconstruirTurnoCerrado(turnoId: string) { // 🔥 CORRECCIÓN: string en vez de number
    const turnoRes = await query(`
      SELECT 
        tc.id as turno_id, tc.usuario_id, tc.caja_id, tc.monto_apertura, 
        tc.abierto, tc.fecha_apertura, tc.fecha_cierre, 
        tc.monto_cierre_sistema, tc.monto_cierre_real, tc.notas_cierre, tc.diferencia,
        c.nombre as caja_nombre, 
        u.nombre_completo as cajero_nombre,
        
        -- Sumamos el efectivo
        (SELECT COALESCE(SUM(pv.monto), 0) 
         FROM pagos_venta pv 
         JOIN ventas v ON pv.venta_id = v.id 
         WHERE v.turno_caja_id = tc.id AND pv.metodo_pago = 'efectivo' AND v.anulada = false
        ) as total_efectivo,
        
        -- Sumamos los pagos electrónicos (tarjetas, transferencias)
        (SELECT COALESCE(SUM(pv.monto), 0) 
         FROM pagos_venta pv 
         JOIN ventas v ON pv.venta_id = v.id 
         WHERE v.turno_caja_id = tc.id AND pv.metodo_pago != 'efectivo' AND v.anulada = false
        ) as total_electronico,
        
        -- Sumamos los ingresos y egresos
        (SELECT COALESCE(SUM(monto), 0) FROM movimientos_caja WHERE turno_caja_id = tc.id AND tipo = 'ingreso') as total_ingresos_extra,
        (SELECT COALESCE(SUM(monto), 0) FROM movimientos_caja WHERE turno_caja_id = tc.id AND tipo = 'egreso') as total_egresos
        
      FROM turnos_caja tc
      LEFT JOIN cajas c ON tc.caja_id = c.id
      JOIN usuarios u ON tc.usuario_id = u.id
      WHERE tc.id = $1
    `, [turnoId]);

    if (turnoRes.rows.length === 0) throw new AppError('Turno no encontrado en la base de datos', 404);
    
    return await this.adjuntarDetallesAlTurno(turnoRes.rows[0]);
  }
}