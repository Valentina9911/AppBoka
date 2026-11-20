
import { getClient, query } from '../../config/database';
import { AppError } from '../../utils/AppError';

export class CuentasService {
  
  static async crearCuenta(data: { mesa_id: number | null, numero_comensales?: number }, meseroId: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      if (data.mesa_id) {
        const cuentaActiva = await client.query(
          'SELECT id FROM cuentas WHERE mesa_id = $1 AND estado = $2',
          [data.mesa_id, 'abierta']
        );
        if (cuentaActiva.rows.length > 0) {
          throw new AppError('La mesa ya tiene una cuenta abierta', 409);
        }
      }

      const result = await client.query(
        `INSERT INTO cuentas (mesa_id, mesero_id, numero_comensales, estado, subtotal, impuestos, total, propina, descuento) 
         VALUES ($1, $2, $3, 'abierta', 0, 0, 0, 0, 0) 
         RETURNING *`,
        [data.mesa_id || null, meseroId, data.numero_comensales || 1]
      );

      if (data.mesa_id) {
        await client.query(
          `UPDATE mesas SET estado = 'ocupada' WHERE id = $1`, 
          [data.mesa_id]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async obtenerCuenta(cuentaId: string) {
    const cRes = await query('SELECT * FROM cuentas WHERE id = $1', [cuentaId]);
    if (cRes.rows.length === 0) throw new AppError('Cuenta no encontrada', 404);

    const iRes = await query(
        `SELECT ci.*, p.nombre AS producto_nombre,
           COALESCE(
             (SELECT json_agg(json_build_object('nombre', cim.nombre_snapshot, 'precio_extra', cim.precio_extra_snapshot))
              FROM cuenta_items_modificadores cim
              WHERE cim.cuenta_item_id = ci.id),
             '[]'::json
           ) AS modificadores
         FROM cuenta_items ci
         JOIN productos p ON ci.producto_id = p.id
         WHERE ci.cuenta_id = $1 AND ci.estado != 'cancelado'
         ORDER BY ci.created_at`,
        [cuentaId]
      );

    return { cuenta: cRes.rows[0], items: iRes.rows };
  }

  static async obtenerCuentasEnEspera() {
    const res = await query(`
      SELECT c.*,
             (SELECT COUNT(*) FROM cuenta_items ci WHERE ci.cuenta_id = c.id AND ci.estado != 'cancelado') as total_items,
             u.nombre_completo as mesero_nombre
      FROM cuentas c
      LEFT JOIN usuarios u ON c.mesero_id = u.id
      WHERE c.mesa_id IS NULL AND c.estado = 'abierta'
      ORDER BY c.created_at DESC
    `);
    return res.rows;
  }

  static async limpiarCuentasFantasma() {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      const fantasmas = await client.query(`
        SELECT id FROM cuentas
        WHERE mesa_id IS NULL AND estado = 'abierta'
          AND created_at < NOW() - INTERVAL '4 hours'
      `);

      if (fantasmas.rows.length > 0) {
        const ids = fantasmas.rows.map(r => r.id);
        await client.query(`UPDATE cuenta_items SET estado = 'cancelado', updated_at = NOW() WHERE cuenta_id = ANY($1)`, [ids]);
        await client.query(`UPDATE cuentas SET estado = 'cancelada', notas = 'Cancelada por limpieza automática (Fantasma > 4h)', updated_at = NOW() WHERE id = ANY($1)`, [ids]);
        console.log(`🧹 Limpieza Automática: ${ids.length} cuentas fantasma eliminadas.`);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error en limpieza de cuentas fantasma:', error);
    } finally {
      client.release();
    }
  }

  static async agregarItem(cuentaId: string, data: { producto_id: string, cantidad: number, notas?: string, modificadores?: { id: string, cantidad: number }[] }) {
    const client = await getClient(); 
    try {
      await client.query('BEGIN');

      const prodRes = await client.query('SELECT * FROM productos WHERE id = $1', [data.producto_id]);
      if (prodRes.rows.length === 0) throw new AppError('Producto no encontrado', 404);
      const producto = prodRes.rows[0];

      let precioExtraTotal = 0;
      let modificadoresAInsertar: any[] = [];
      const modsArray = data.modificadores || [];

      if (modsArray.length > 0) {
        const modsIds = modsArray.map(m => m.id);
        const modsRes = await client.query(
          `SELECT id, nombre, precio_extra FROM modificadores WHERE id = ANY($1)`,
          [modsIds]
        );

        for (const modReq of modsArray) {
          const dbMod = modsRes.rows.find(r => r.id === modReq.id);
          if (dbMod && modReq.cantidad > 0) {
            precioExtraTotal += (parseFloat(dbMod.precio_extra) * modReq.cantidad);
            for (let i = 0; i < modReq.cantidad; i++) {
              modificadoresAInsertar.push({ ...dbMod });
            }
          }
        }
      }

      const precioUnitarioFinal = parseFloat(producto.precio_venta) + precioExtraTotal;
      const notasStr = data.notas || '';

      const candidatesRes = await client.query(
        `SELECT ci.id, ci.cantidad, ci.precio_unitario,
          ARRAY(
            SELECT modificador_id::text
            FROM cuenta_items_modificadores
            WHERE cuenta_item_id = ci.id
            ORDER BY modificador_id
          ) as mods
         FROM cuenta_items ci
         WHERE ci.cuenta_id = $1 
           AND ci.producto_id = $2 
           AND COALESCE(ci.notas, '') = $3 
           AND ci.estado != 'cancelado'`,
        [cuentaId, data.producto_id, notasStr]
      );

      let itemToUpdateId = null;
      const incomingModsSorted = modificadoresAInsertar.map(m => m.id).sort().join(',');

      for (const row of candidatesRes.rows) {
        const dbModsSorted = (row.mods || []).sort().join(',');
        if (dbModsSorted === incomingModsSorted) {
          itemToUpdateId = row.id;
          break;
        }
      }

      if (itemToUpdateId) {
        await client.query(
          `UPDATE cuenta_items 
           SET cantidad = cantidad + $1, 
               subtotal = (cantidad + $1) * precio_unitario 
           WHERE id = $2`,
          [data.cantidad, itemToUpdateId]
        );
      } else {
        const subtotalFinal = precioUnitarioFinal * data.cantidad;
        const itemRes = await client.query(
          `INSERT INTO cuenta_items (cuenta_id, producto_id, cantidad, precio_unitario, subtotal, notas, estado)
           VALUES ($1, $2, $3, $4, $5, $6, 'pendiente') 
           RETURNING id`,
          [cuentaId, data.producto_id, data.cantidad, precioUnitarioFinal, subtotalFinal, notasStr]
        );
        const nuevoItemId = itemRes.rows[0].id;

        if (modificadoresAInsertar.length > 0) {
          const insertPromises = modificadoresAInsertar.map(mod => {
            return client.query(
              `INSERT INTO cuenta_items_modificadores (cuenta_item_id, modificador_id, nombre_snapshot, precio_extra_snapshot)
               VALUES ($1, $2, $3, $4)`,
              [nuevoItemId, mod.id, mod.nombre, mod.precio_extra]
            );
          });
          await Promise.all(insertPromises);
        }
      }

      await client.query(
        `UPDATE cuentas 
         SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM cuenta_items WHERE cuenta_id = $1 AND estado != 'cancelado')
         WHERE id = $1`,
        [cuentaId]
      );

      await client.query('COMMIT'); 
      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error al agregar item:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async agregarItemsBulk(cuentaId: string, items: any[]) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const data of items) {
        const prodRes = await client.query('SELECT * FROM productos WHERE id = $1', [data.producto_id]);
        if (prodRes.rows.length === 0) continue; 
        const producto = prodRes.rows[0];

        let precioExtraTotal = 0;
        let modificadoresAInsertar: any[] = [];
        const modsArray = data.modificadores || [];

        if (modsArray.length > 0) {
          const modsIds = modsArray.map((m: any) => m.id);
          const modsRes = await client.query(
            `SELECT id, nombre, precio_extra FROM modificadores WHERE id = ANY($1)`,
            [modsIds]
          );

          for (const modReq of modsArray) {
            const dbMod = modsRes.rows.find(r => r.id === modReq.id);
            if (dbMod && modReq.cantidad > 0) {
              precioExtraTotal += (parseFloat(dbMod.precio_extra) * modReq.cantidad);
              for (let i = 0; i < modReq.cantidad; i++) {
                modificadoresAInsertar.push({ ...dbMod });
              }
            }
          }
        }

        const precioUnitarioFinal = parseFloat(producto.precio_venta) + precioExtraTotal;
        const notasStr = data.notas || '';

        const candidatesRes = await client.query(
          `SELECT ci.id, ci.cantidad, ci.precio_unitario,
            ARRAY(
              SELECT modificador_id::text
              FROM cuenta_items_modificadores
              WHERE cuenta_item_id = ci.id
              ORDER BY modificador_id
            ) as mods
           FROM cuenta_items ci
           WHERE ci.cuenta_id = $1 
             AND ci.producto_id = $2 
             AND COALESCE(ci.notas, '') = $3 
             AND ci.estado != 'cancelado'`,
          [cuentaId, data.producto_id, notasStr]
        );

        let itemToUpdateId = null;
        const incomingModsSorted = modificadoresAInsertar.map(m => m.id).sort().join(',');

        for (const row of candidatesRes.rows) {
          const dbModsSorted = (row.mods || []).sort().join(',');
          if (dbModsSorted === incomingModsSorted) {
            itemToUpdateId = row.id;
            break;
          }
        }

        if (itemToUpdateId) {
          await client.query(
            `UPDATE cuenta_items 
             SET cantidad = cantidad + $1, 
                 subtotal = (cantidad + $1) * precio_unitario 
             WHERE id = $2`,
            [data.cantidad, itemToUpdateId]
          );
        } else {
          const subtotalFinal = precioUnitarioFinal * data.cantidad;
          const itemRes = await client.query(
            `INSERT INTO cuenta_items (cuenta_id, producto_id, cantidad, precio_unitario, subtotal, notas, estado)
             VALUES ($1, $2, $3, $4, $5, $6, 'pendiente') 
             RETURNING id`,
            [cuentaId, data.producto_id, data.cantidad, precioUnitarioFinal, subtotalFinal, notasStr]
          );
          const nuevoItemId = itemRes.rows[0].id;

          if (modificadoresAInsertar.length > 0) {
            const insertPromises = modificadoresAInsertar.map(mod => {
              return client.query(
                `INSERT INTO cuenta_items_modificadores (cuenta_item_id, modificador_id, nombre_snapshot, precio_extra_snapshot)
                 VALUES ($1, $2, $3, $4)`,
                [nuevoItemId, mod.id, mod.nombre, mod.precio_extra]
              );
            });
            await Promise.all(insertPromises);
          }
        }
      }

      await client.query(
        `UPDATE cuentas 
         SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM cuenta_items WHERE cuenta_id = $1 AND estado != 'cancelado')
         WHERE id = $1`,
        [cuentaId]
      );

      await client.query('COMMIT');
      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error sincronizando ítems bulk:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async actualizarItem(cuentaId: string, itemId: string, cantidad: number) {
    if (cantidad < 1) throw new AppError('La cantidad no puede ser menor a 1', 400);

    const itemRes = await query('SELECT precio_unitario FROM cuenta_items WHERE id = $1 AND cuenta_id = $2', [itemId, cuentaId]);
    if (itemRes.rows.length === 0) throw new AppError('Ítem no encontrado', 404);

    const nuevoSubtotal = cantidad * Number(itemRes.rows[0].precio_unitario);

    await query(
      `UPDATE cuenta_items SET cantidad = $1, subtotal = $2, updated_at = NOW() WHERE id = $3`, 
      [cantidad, nuevoSubtotal, itemId]
    );

    await this.recalcularTotales(cuentaId);
  }

  static async eliminarItem(cuentaId: string, itemId: string) {
    await query(
      `UPDATE cuenta_items SET estado = 'cancelado', updated_at = NOW() WHERE id = $1 AND cuenta_id = $2`, 
      [itemId, cuentaId]
    );
    await this.recalcularTotales(cuentaId);
  }

  static async recalcularTotales(cuentaId: string) {
    const totales = await query(
      `SELECT COALESCE(SUM(subtotal), 0) as total FROM cuenta_items WHERE cuenta_id = $1 AND estado != 'cancelado'`,
      [cuentaId]
    );
    const totalMesa = Number(totales.rows[0].total);
    await query(
      `UPDATE cuentas SET subtotal = $1, total = $2, updated_at = NOW() WHERE id = $3`, 
      [totalMesa, totalMesa, cuentaId]
    );
  }

  static async transferirMesa(cuentaId: string, nuevaMesaId: number) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const cuenta = await client.query('SELECT mesa_id, estado FROM cuentas WHERE id = $1 FOR UPDATE', [cuentaId]);
      if (cuenta.rows.length === 0 || cuenta.rows[0].estado !== 'abierta') {
        throw new AppError('La cuenta no está abierta o no existe', 400);
      }
      
      const mesaAntiguaId = cuenta.rows[0].mesa_id;

      if (mesaAntiguaId === nuevaMesaId) throw new AppError('La mesa destino es la misma', 400);

      const nuevaMesa = await client.query('SELECT estado FROM mesas WHERE id = $1 FOR UPDATE', [nuevaMesaId]);
      if (nuevaMesa.rows.length === 0) throw new AppError('La mesa destino no existe', 404);
      if (nuevaMesa.rows[0].estado !== 'disponible') throw new AppError('La mesa destino ya está ocupada o reservada', 409);

      await client.query('UPDATE cuentas SET mesa_id = $1, updated_at = NOW() WHERE id = $2', [nuevaMesaId, cuentaId]);
      await client.query('UPDATE mesas SET estado = $1 WHERE id = $2', ['disponible', mesaAntiguaId]);
      await client.query('UPDATE mesas SET estado = $1 WHERE id = $2', ['ocupada', nuevaMesaId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async unirCuentas(cuentaIdOrigen: string, cuentaIdDestino: string) {
    if (cuentaIdOrigen === cuentaIdDestino) throw new AppError('No puedes unir una cuenta consigo misma', 400);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const origen = await client.query('SELECT mesa_id FROM cuentas WHERE id = $1 AND estado = $2 FOR UPDATE', [cuentaIdOrigen, 'abierta']);
      const destino = await client.query('SELECT id FROM cuentas WHERE id = $1 AND estado = $2 FOR UPDATE', [cuentaIdDestino, 'abierta']);

      if (origen.rows.length === 0 || destino.rows.length === 0) {
        throw new AppError('Ambas cuentas deben estar abiertas', 400);
      }

      await client.query('UPDATE cuenta_items SET cuenta_id = $1, updated_at = NOW() WHERE cuenta_id = $2', [cuentaIdDestino, cuentaIdOrigen]);
      await client.query(`UPDATE cuentas SET estado = 'anulada', notas = 'Unida con la cuenta ${cuentaIdDestino}', updated_at = NOW() WHERE id = $1`, [cuentaIdOrigen]);
      await client.query('UPDATE mesas SET estado = $1 WHERE id = $2', ['disponible', origen.rows[0].mesa_id]);

      await client.query('COMMIT');

      await this.recalcularTotales(cuentaIdDestino);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async dividirCuenta(cuentaIdOriginal: string, itemsADividir: { itemId: string, cantidad: number }[], cajeroId: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const cuentaOriginal = await client.query('SELECT mesa_id, numero_comensales FROM cuentas WHERE id = $1 AND estado = $2 FOR UPDATE', [cuentaIdOriginal, 'abierta']);
      if (cuentaOriginal.rows.length === 0) throw new AppError('Cuenta original no válida', 400);

      const nuevaCuenta = await client.query(
        `INSERT INTO cuentas (mesa_id, usuario_id, numero_comensales, estado, subtotal, total, notas) 
         VALUES ($1, $2, $3, 'abierta', 0, 0, 'Cuenta dividida') RETURNING id`,
        [cuentaOriginal.rows[0].mesa_id, cajeroId, cuentaOriginal.rows[0].numero_comensales]
      );
      
      const nuevaCuentaId = nuevaCuenta.rows[0].id;

      for (const reqItem of itemsADividir) {
        const itemRes = await client.query('SELECT * FROM cuenta_items WHERE id = $1 AND cuenta_id = $2 FOR UPDATE', [reqItem.itemId, cuentaIdOriginal]);
        if (itemRes.rows.length === 0) throw new AppError(`Ítem ${reqItem.itemId} no encontrado en la orden original`, 404);
        
        const itemActual = itemRes.rows[0];
        if (reqItem.cantidad > itemActual.cantidad || reqItem.cantidad <= 0) {
          throw new AppError('Cantidad a dividir inválida', 400);
        }

        if (reqItem.cantidad === itemActual.cantidad) {
          await client.query('UPDATE cuenta_items SET cuenta_id = $1, updated_at = NOW() WHERE id = $2', [nuevaCuentaId, reqItem.itemId]);
        } else {
          const nuevaCantOriginal = itemActual.cantidad - reqItem.cantidad;
          const nuevoSubOriginal = nuevaCantOriginal * itemActual.precio_unitario;
          await client.query('UPDATE cuenta_items SET cantidad = $1, subtotal = $2, updated_at = NOW() WHERE id = $3', [nuevaCantOriginal, nuevoSubOriginal, reqItem.itemId]);
          
          const subNueva = reqItem.cantidad * itemActual.precio_unitario;
          await client.query(
            `INSERT INTO cuenta_items (cuenta_id, producto_id, cantidad, precio_unitario, impuesto_pct, subtotal, notas, estado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [nuevaCuentaId, itemActual.producto_id, reqItem.cantidad, itemActual.precio_unitario, itemActual.impuesto_pct, subNueva, itemActual.notas, itemActual.estado]
          );
        }
      }

      await client.query('COMMIT');
      
      await this.recalcularTotales(cuentaIdOriginal);
      await this.recalcularTotales(nuevaCuentaId);

      return nuevaCuentaId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}