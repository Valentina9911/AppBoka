
import { getClient, query } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { Venta, PagoDTO } from '../../types';

export class VentasService {
  static async pagarCuenta(dto: any, cajeroId: string): Promise<{ venta: Venta; pagos: any[]; cambio: number; }> {
    if (!dto.cuenta_id) throw new AppError('El campo "cuenta_id" es requerido', 400);
    if (!dto.pagos || dto.pagos.length === 0) throw new AppError('Debe proporcionar al menos un método de pago', 400);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      let turnoCajaId = dto.turno_caja_id;
      if (!turnoCajaId) {
        const turnoResult = await client.query(`SELECT id FROM turnos_caja WHERE usuario_id = $1 AND abierto = TRUE LIMIT 1`, [cajeroId]);
        if (turnoResult.rows.length === 0) throw new AppError('No tienes un turno de caja abierto.', 400);
        turnoCajaId = turnoResult.rows[0].id;
      }

      const cuentaResult = await client.query(`SELECT id, numero, cliente_id, estado, subtotal, impuestos, descuento, total, propina FROM cuentas WHERE id = $1 FOR UPDATE`, [dto.cuenta_id]);
      if (cuentaResult.rows.length === 0) throw new AppError('Cuenta no encontrada', 404);
      const cuenta = cuentaResult.rows[0];
      
      if (cuenta.estado !== 'abierta') throw new AppError(`La cuenta #${cuenta.numero} ya fue pagada o cancelada`, 409);

      if (dto.cliente_id && dto.cliente_id !== cuenta.cliente_id) {
        await client.query('UPDATE cuentas SET cliente_id = $1 WHERE id = $2', [dto.cliente_id, cuenta.id]);
        cuenta.cliente_id = dto.cliente_id;
      }

      const descuentoCobro = dto.descuento || 0;
      
      if (descuentoCobro > 0) {
        const rolRes = await client.query(`
          SELECT r.nombre 
          FROM usuario_roles ur 
          JOIN roles r ON ur.rol_id = r.id 
          WHERE ur.usuario_id = $1 AND r.nombre IN ('Super Admin', 'Administrador', 'admin')
        `, [cajeroId]);
        
        if (rolRes.rows.length === 0) {
          throw new AppError('Alerta de Seguridad: No tienes privilegios de administrador para aplicar descuentos monetarios.', 403);
        }
      }

      const propina = dto.propina || parseFloat(cuenta.propina) || 0;
      
      const totalCuenta = parseFloat(cuenta.total) - descuentoCobro;
      const totalConPropina = totalCuenta + propina;
      
      const totalPagado = dto.pagos.reduce((sum: number, p: PagoDTO) => sum + p.monto, 0);

      if (totalPagado < totalConPropina) throw new AppError(`Pago insuficiente. Faltan $${(totalConPropina - totalPagado).toFixed(2)}`, 400);
      const cambio = parseFloat((totalPagado - totalConPropina).toFixed(2));

      const descuentoTotal = parseFloat(cuenta.descuento) + descuentoCobro;

      const ventaResult = await client.query(
        `INSERT INTO ventas (cuenta_id, cliente_id, cajero_id, turno_caja_id, subtotal, impuestos, descuento, propina, total, total_pagado, cambio, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [dto.cuenta_id, cuenta.cliente_id, cajeroId, turnoCajaId, cuenta.subtotal, cuenta.impuestos, descuentoTotal, propina, totalCuenta, totalPagado, cambio, dto.notas || null]
      );
      const venta = ventaResult.rows[0];

      const pagosInsertados = [];
      for (const pago of dto.pagos) {
        const pagoResult = await client.query(`INSERT INTO pagos_venta (venta_id, metodo_pago, monto, referencia, notas) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [venta.id, pago.metodo_pago, pago.monto, pago.referencia || null, pago.notas || null]);
        pagosInsertados.push(pagoResult.rows[0]);
      }

      await client.query(`UPDATE cuentas SET estado = 'pagada', propina = $2 WHERE id = $1`, [dto.cuenta_id, propina]);
      await client.query('COMMIT');
      return { venta, pagos: pagosInsertados, cambio };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async obtenerVenta(ventaId: string): Promise<any> {
    const ventaResult = await query(`
      SELECT v.*, c.numero AS cuenta_numero, 
             cl.nombre AS cliente_nombre, cl.cedula_nit AS cliente_documento, 
             uc.nombre_completo AS cajero_nombre,
             um.nombre_completo AS mesero_nombre
      FROM ventas v 
      JOIN cuentas c ON v.cuenta_id = c.id 
      JOIN clientes cl ON v.cliente_id = cl.id 
      JOIN usuarios uc ON v.cajero_id = uc.id 
      LEFT JOIN usuarios um ON c.mesero_id = um.id 
      WHERE v.id = $1
    `, [ventaId]); 
    
    if (ventaResult.rows.length === 0) throw new AppError('Venta no encontrada', 404);
    
    const pagosResult = await query('SELECT * FROM pagos_venta WHERE venta_id = $1 ORDER BY created_at', [ventaId]);
    
    const itemsResult = await query(`
      SELECT ci.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
             COALESCE(
               (SELECT json_agg(json_build_object('nombre', cim.nombre_snapshot, 'precio_extra', cim.precio_extra_snapshot))
                FROM cuenta_items_modificadores cim
                WHERE cim.cuenta_item_id = ci.id AND cim.precio_extra_snapshot > 0),
               '[]'::json
             ) AS modificadores
      FROM cuenta_items ci 
      JOIN productos p ON ci.producto_id = p.id 
      WHERE ci.cuenta_id = $1 AND ci.estado != 'cancelado' 
      ORDER BY ci.created_at
    `, [ventaResult.rows[0].cuenta_id]);
    
    return { venta: ventaResult.rows[0], pagos: pagosResult.rows, items: itemsResult.rows };
  }

  static async listarDelDia(turnoId?: string): Promise<any[]> {
    let sql = `SELECT v.id, v.numero_factura, v.total, v.total_pagado, v.cambio, v.anulada, v.created_at, cl.nombre AS cliente_nombre, u.nombre_completo AS cajero_nombre FROM ventas v JOIN clientes cl ON v.cliente_id = cl.id JOIN usuarios u ON v.cajero_id = u.id WHERE v.created_at >= CURRENT_DATE`;
    const params: any[] = [];
    if (turnoId) { params.push(turnoId); sql += ` AND v.turno_caja_id = $${params.length}`; }
    sql += ' ORDER BY v.created_at DESC';
    const resultado = await query(sql, params);
    return resultado.rows;
  }

  static async pagoRapido(dto: { mesa_id: number | null, cliente_id: number, items: any[], pagos: any[], descuento?: number }, cajeroId: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const turnoResult = await client.query('SELECT id FROM turnos_caja WHERE usuario_id = $1 AND abierto = true LIMIT 1', [cajeroId]);
      if (turnoResult.rows.length === 0) throw new AppError('No hay turno de caja abierto para este usuario', 400);
      const turno_caja_id = turnoResult.rows[0].id;

      let subtotal = 0;
      let impuestos = 0;
      for (const item of dto.items) {
        subtotal += item.precio_unitario * item.cantidad;
        impuestos += (item.precio_unitario * item.cantidad) * ((item.impuesto_pct || 0) / 100);
      }
      
      const descuentoCobro = dto.descuento || 0;
      
      if (descuentoCobro > 0) {
        const rolRes = await client.query(`
          SELECT r.nombre 
          FROM usuario_roles ur 
          JOIN roles r ON ur.rol_id = r.id 
          WHERE ur.usuario_id = $1 AND r.nombre IN ('Super Admin', 'Administrador', 'admin')
        `, [cajeroId]);
        
        if (rolRes.rows.length === 0) {
          throw new AppError('Alerta de Seguridad: No tienes privilegios de administrador para aplicar descuentos.', 403);
        }
      }

      const total = (subtotal + impuestos) - descuentoCobro;

      const cuentaResult = await client.query(
        `INSERT INTO cuentas (mesa_id, cliente_id, estado, subtotal, impuestos, descuento, propina, total)
         VALUES ($1, $2, 'abierta', $3, $4, $5, 0, $6) RETURNING id, numero`,
        [dto.mesa_id || null, dto.cliente_id || 1, subtotal, impuestos, descuentoCobro, total]
      );
      const cuenta = cuentaResult.rows[0];

      for (const item of dto.items) {
        await client.query(
          `INSERT INTO cuenta_items (cuenta_id, producto_id, cantidad, precio_unitario, notas, estado)
           VALUES ($1, $2, $3, $4, $5, 'entregado')`,
          [cuenta.id, item.producto_id, item.cantidad, item.precio_unitario, item.notas || null]
        );
      }

      const totalPagado = dto.pagos.reduce((sum: number, p: any) => sum + p.monto, 0);
      if (totalPagado < total) {
        throw new AppError(`Pago insuficiente. Faltan $${(total - totalPagado).toFixed(2)}`, 400);
      }
      const cambio = parseFloat((totalPagado - total).toFixed(2));

      const ventaResult = await client.query(
        `INSERT INTO ventas (cuenta_id, cliente_id, cajero_id, turno_caja_id, subtotal, impuestos, descuento, propina, total, total_pagado, cambio)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10) RETURNING *`,
        [cuenta.id, dto.cliente_id || 1, cajeroId, turno_caja_id, subtotal, impuestos, descuentoCobro, total, totalPagado, cambio]
      );
      const venta = ventaResult.rows[0];

      const pagosInsertados = [];
      for (const pago of dto.pagos) {
        const pagoResult = await client.query(
          `INSERT INTO pagos_venta (venta_id, metodo_pago, monto, referencia)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [venta.id, pago.metodo_pago, pago.monto, pago.referencia || null]
        );
        pagosInsertados.push(pagoResult.rows[0]);
      }

      await client.query(`UPDATE cuentas SET estado = 'pagada' WHERE id = $1`, [cuenta.id]);

      await client.query('COMMIT');
      return { venta, pagos: pagosInsertados, cambio };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      throw new AppError('Error procesando el pago rápido. La transacción fue revertida.', 500, false);
    } finally {
      client.release();
    }
  }

  static async obtenerUltimasVentas() {
    const result = await query(`
      SELECT 
        v.*, 
        u.nombre_completo as cajero_nombre,
        COALESCE(
          json_agg(
            json_build_object('id', pv.id, 'metodo_pago', pv.metodo_pago, 'monto', pv.monto)
          ) FILTER (WHERE pv.id IS NOT NULL), '[]'
        ) as pagos
      FROM ventas v
      LEFT JOIN usuarios u ON v.cajero_id = u.id
      LEFT JOIN pagos_venta pv ON v.id = pv.venta_id
      GROUP BY v.id, u.nombre_completo
      ORDER BY v.created_at DESC
      LIMIT 50
    `);
    return result.rows;
  }

  static async cambiarMetodoPago(pagoId: string, nuevoMetodo: string) {
    const result = await query(
      `UPDATE pagos_venta SET metodo_pago = $1 WHERE id = $2 RETURNING *`,
      [nuevoMetodo, pagoId]
    );
    if (result.rows.length === 0) throw new AppError('Pago no encontrado', 404);
    return result.rows[0];
  }

  static async anularVenta(ventaId: string, adminId: string, motivo: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      const ventaRes = await client.query('SELECT * FROM ventas WHERE id = $1 FOR UPDATE', [ventaId]);
      if (ventaRes.rows.length === 0) throw new AppError('Venta no encontrada', 404);
      const venta = ventaRes.rows[0];
      
      if (venta.anulada) throw new AppError('La venta ya se encuentra anulada', 400);

      await client.query(
        `UPDATE ventas SET anulada = true, motivo_anulacion = $1, updated_at = NOW() WHERE id = $2`,
        [motivo, ventaId]
      );

      await client.query(
        `UPDATE cuentas SET estado = 'cancelada', updated_at = NOW() WHERE id = $1`,
        [venta.cuenta_id]
      );

      const itemsRes = await client.query(
        `SELECT ci.producto_id, ci.cantidad, p.tipo, p.controla_stock
         FROM cuenta_items ci
         JOIN productos p ON ci.producto_id = p.id
         WHERE ci.cuenta_id = $1 AND ci.estado != 'cancelado'`,
        [venta.cuenta_id]
      );

      await client.query(
        `UPDATE cuenta_items SET estado = 'cancelado', updated_at = NOW() WHERE cuenta_id = $1`,
        [venta.cuenta_id]
      );

      for (const item of itemsRes.rows) {
        if (item.tipo === 'simple' && item.controla_stock) {
          await client.query(
            `INSERT INTO movimientos_inventario 
             (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, notas, usuario_id)
             VALUES ($1, 'ajuste_positivo', $2, 0, 0, $3, 'anulacion_venta', $4, $5)`,
            [item.producto_id, item.cantidad, ventaId, `Anulación Venta #${venta.numero_factura}`, adminId]
          );
        } else if (item.tipo === 'compuesto') {
          const recetaRes = await client.query(
            `SELECT ri.ingrediente_id, ri.cantidad, p.controla_stock
             FROM receta_ingredientes ri
             JOIN productos p ON ri.ingrediente_id = p.id
             WHERE ri.producto_id = $1`,
            [item.producto_id]
          );
          for (const ing of recetaRes.rows) {
            if (ing.controla_stock) {
              const cantDevolver = item.cantidad * ing.cantidad;
              await client.query(
                `INSERT INTO movimientos_inventario 
                 (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_id, referencia_tipo, notas, usuario_id)
                 VALUES ($1, 'ajuste_positivo', $2, 0, 0, $3, 'anulacion_venta', $4, $5)`,
                [ing.ingrediente_id, cantDevolver, ventaId, `Anulación Venta #${venta.numero_factura} (Receta)`, adminId]
              );
            }
          }
        }
      }

      await client.query(
        `INSERT INTO auditoria_log (usuario_id, accion, tabla_afectada, registro_id, datos_nuevos)
         VALUES ($1, 'ANULAR_VENTA', 'ventas', $2, $3)`,
        [adminId, ventaId, JSON.stringify({ motivo })]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}