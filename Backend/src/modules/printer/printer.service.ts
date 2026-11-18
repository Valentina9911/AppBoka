
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';
import { query } from '../../config/database';
import { VentasService } from '../ventas/ventas.service';
import { AppError } from '../../utils/AppError';

export class PrinterService {
  static getPrinter(area: 'caja' | 'cocina'): ThermalPrinter {
    const printerInterface = area === 'caja' 
      ? (process.env.PRINTER_CAJA_INTERFACE || '//localhost/POS80') 
      : (process.env.PRINTER_COCINA_INTERFACE || 'tcp://192.168.1.100');
      
    const typeStr = area === 'caja' ? process.env.PRINTER_CAJA_TYPE : process.env.PRINTER_COCINA_TYPE;
    const type = typeStr === 'star' ? PrinterTypes.STAR : PrinterTypes.EPSON;
    
    return new ThermalPrinter({ 
      type, 
      interface: printerInterface, 
      width: 42,
      characterSet: undefined,
      removeSpecialCharacters: true,
      lineCharacter: "-", 
      options: { timeout: 5000 } 
    });
  }

  private static formatCurrency(val: number | string): string {
    return `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  static async imprimirComanda(cuentaId: string): Promise<void> {
    try {
      console.log(`\n========================================`);
      console.log(`👨‍🍳 INICIANDO IMPRESIÓN DE COMANDA: ${cuentaId}`);

      const cuentaResult = await query(
        `SELECT c.*, m.nombre AS mesa_nombre, u.nombre_completo AS mesero_nombre
         FROM cuentas c
         LEFT JOIN mesas m ON c.mesa_id = m.id
         LEFT JOIN usuarios u ON c.mesero_id = u.id
         WHERE c.id = $1`,
        [cuentaId]
      );

      if (cuentaResult.rows.length === 0) throw new AppError('Cuenta no encontrada', 404);
      const cuenta = cuentaResult.rows[0];

      const itemsResult = await query(
        `SELECT ci.*, p.nombre AS producto_nombre,
           COALESCE(
             (SELECT json_agg(json_build_object('nombre', cim.nombre_snapshot, 'precio_extra', cim.precio_extra_snapshot))
              FROM cuenta_items_modificadores cim
              WHERE cim.cuenta_item_id = ci.id),
             '[]'::json
           ) AS modificadores
         FROM cuenta_items ci
         JOIN productos p ON ci.producto_id = p.id
         LEFT JOIN categorias cat ON p.categoria_id = cat.id
         WHERE ci.cuenta_id = $1 
           AND ci.estado = 'pendiente' 
           AND COALESCE(cat.enviar_cocina, true) = true
         ORDER BY ci.created_at`,
        [cuentaId]
      );

      if (itemsResult.rows.length === 0) {
        console.log('⚠️ No hay productos nuevos (pendientes) para enviar a cocina.');
        return;
      }

      const printer = this.getPrinter('cocina');

      printer.alignCenter();
      printer.setTextSize(2, 2);
      printer.bold(true);
      printer.println(cuenta.mesa_nombre ? cuenta.mesa_nombre.toUpperCase() : "PARA LLEVAR");
      printer.bold(false);
      printer.setTextNormal();
      
      printer.drawLine();
      printer.alignLeft();
      printer.println(`Orden #: ${cuenta.numero || cuenta.id.split('-')[0]}`);
      printer.println(`Mesero: ${cuenta.mesero_nombre || 'N/A'}`);
      printer.println(`Fecha: ${new Date().toLocaleTimeString('es-CO')}`);
      printer.drawLine();

      printer.setTextSize(1, 1);
      for (const item of itemsResult.rows) {
        const qty = parseFloat(item.cantidad).toString();
        printer.println(`[${qty}] x ${item.producto_nombre.toUpperCase()}`);
        
        let mods = item.modificadores;
        if (typeof mods === 'string') {
          try { mods = JSON.parse(mods); } catch (e) { mods = []; }
        }
        
        if (Array.isArray(mods) && mods.length > 0) {
          printer.setTextNormal(); 
          
          const modsAgrupados = mods.reduce((acc: any, mod: any) => {
            const name = mod.nombre || mod;
            if (!acc[name]) acc[name] = { ...mod, _cantidad: 1 };
            else acc[name]._cantidad += 1;
            return acc;
          }, {});

          for (const key in modsAgrupados) {
            const mod = modsAgrupados[key];
            const modName = mod.nombre || key;
            const prefix = mod._cantidad > 1 ? `${mod._cantidad}x ` : '';
            printer.println(`  -> ${prefix}${String(modName).toUpperCase()}`);
          }
          printer.setTextSize(1, 1); 
        }
        
        if (item.notas) {
          printer.setTextNormal();
          printer.bold(true);
          printer.println(`  *** NOTA: ${item.notas.toUpperCase()}`);
          printer.bold(false);
          printer.setTextSize(1, 1);
        }
        printer.newLine();
      }

      printer.setTextNormal();
      printer.alignCenter();
      printer.println("--- FIN DE COMANDA ---");
      printer.cut();

      await printer.execute();
      console.log(`✅ Ticket enviado al hardware de cocina.`);

      const itemIds = itemsResult.rows.map(row => row.id);
      if (itemIds.length > 0) {
        await query(
          `UPDATE cuenta_items SET estado = 'preparando', updated_at = NOW() WHERE id = ANY($1)`,
          [itemIds]
        );
      }
      console.log(`========================================\n`);

    } catch (error) {
      console.error('❌ Error crítico en la comanda de cocina:', error);
    }
  }

  static async imprimirReporteCaja(turno: any, tipo: 'X' | 'Z', opciones?: { incluir_movimientos?: boolean, incluir_productos?: boolean }): Promise<void> {
    try {
      console.log(`\n========================================`);
      console.log(`🖨️ INICIANDO IMPRESIÓN REPORTE ${tipo}`);
      
      const printer = this.getPrinter('caja');

      const configRows = await query('SELECT clave, valor FROM configuracion');
      const config = configRows.rows.reduce((acc: any, row: any) => { acc[row.clave] = row.valor; return acc; }, {});

      printer.alignCenter();
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.println(config.negocio_nombre || "BOKA Restaurante");
      printer.bold(false);
      printer.setTextNormal();
      printer.println(`REPORTE ${tipo} DE CAJA`);
      printer.drawLine();

      printer.alignLeft();
      printer.println(`Fecha: ${new Date().toLocaleString('es-CO')}`);
      printer.println(`Cajero: ${turno.cajero || turno.cajero_nombre}`);
      printer.println(`Caja: ${turno.caja_nombre || 'Caja Principal'}`);
      printer.drawLine();

      printer.leftRight("Base Inicial:", this.formatCurrency(turno.monto_apertura));
      printer.leftRight("Ventas Efectivo:", this.formatCurrency(turno.total_efectivo));
      printer.leftRight("Pagos Electronicos:", this.formatCurrency(turno.total_electronico));
      
      if (Number(turno.total_egresos) > 0) printer.leftRight("(-) Egresos:", `-${this.formatCurrency(turno.total_egresos)}`);
      if (Number(turno.total_ingresos_extra) > 0) printer.leftRight("(+) Ingresos Extra:", this.formatCurrency(turno.total_ingresos_extra));
      if (Number(turno.total_descuento) > 0) printer.leftRight("Descuentos:", this.formatCurrency(turno.total_descuento));
      if (Number(turno.total_propina) > 0) printer.leftRight("Propinas Recaudadas:", this.formatCurrency(turno.total_propina));
      
      printer.drawLine();

      const totalVentas = Number(turno.total_efectivo) + Number(turno.total_electronico);
      const efectivoEsperado = Number(turno.monto_apertura) + Number(turno.total_efectivo) + Number(turno.total_ingresos_extra) - Number(turno.total_egresos);

      printer.bold(true);
      printer.leftRight("TOTAL VENTAS:", this.formatCurrency(totalVentas));
      printer.leftRight("EFECTIVO EN CAJON:", this.formatCurrency(efectivoEsperado));
      printer.bold(false);

      if (tipo === 'Z') {
        printer.drawLine();
        printer.leftRight("Conteo Fisico Real:", this.formatCurrency(turno.monto_cierre_real));
        const diferencia = Number(turno.diferencia);
        printer.leftRight("Diferencia:", this.formatCurrency(diferencia));
      }

      if (opciones?.incluir_movimientos && turno.movimientos_detalle?.length > 0) {
        printer.drawLine();
        printer.alignCenter();
        printer.bold(true);
        printer.println("DETALLE DE MOVIMIENTOS");
        printer.bold(false);
        for (const mov of turno.movimientos_detalle) {
           const signo = mov.tipo === 'ingreso' ? '(+)' : '(-)';
           printer.leftRight(`${signo} ${mov.descripcion}`, this.formatCurrency(mov.monto));
        }
      }

      if (opciones?.incluir_productos && turno.productos_detalle?.length > 0) {
        printer.drawLine();
        printer.alignCenter();
        printer.bold(true);
        printer.println("PRODUCTOS VENDIDOS");
        printer.bold(false);
        
        printer.tableCustom([
          { text: "CANT", align: "LEFT", width: 0.15 },
          { text: "PRODUCTO", align: "LEFT", width: 0.50 },
          { text: "TOTAL", align: "RIGHT", width: 0.35 }
        ]);
        printer.drawLine();
        
        for (const prod of turno.productos_detalle) {
          printer.tableCustom([
            { text: parseFloat(prod.cantidad).toString(), align: "LEFT", width: 0.15 },
            { text: prod.nombre.substring(0, 18), align: "LEFT", width: 0.50 },
            { text: this.formatCurrency(prod.total), align: "RIGHT", width: 0.35 }
          ]);
        }
      }

      printer.drawLine();
      printer.alignCenter();
      printer.println("--- FIN DE REPORTE ---");
      printer.cut();
      
      await printer.execute();
      console.log(`✅ Reporte ${tipo} impreso exitosamente!`);
      console.log(`========================================\n`);
    } catch (error) {
      console.error(`❌ Error imprimiendo Reporte ${tipo}:`, error);
    }
  }

  static async imprimirFactura(ventaId: string): Promise<void> {
    try {
      console.log(`\n========================================`);
      console.log(`🖨️ INICIANDO IMPRESIÓN DE FACTURA: ${ventaId}`);
      
      const { venta, pagos, items } = await VentasService.obtenerVenta(ventaId);
      const printer = this.getPrinter('caja');

      const configRows = await query('SELECT clave, valor FROM configuracion');
      const config = configRows.rows.reduce((acc: any, row: any) => { acc[row.clave] = row.valor; return acc; }, {});

      printer.alignCenter();
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.println(config.negocio_nombre || "BOKA Restaurante");
      printer.bold(false);
      printer.setTextNormal();
      printer.println(config.negocio_direccion || "Dirección Local");
      printer.println(`NIT: ${config.negocio_nit || "N/A"}`);
      printer.println(`Tel: ${config.negocio_telefono || "N/A"}`);
      printer.drawLine();

      printer.alignLeft();
      printer.println(`Factura #: ${venta.numero_factura}`);
      printer.println(`Fecha: ${new Date(venta.created_at).toLocaleString('es-CO')}`);
      printer.println(`Cajero: ${venta.cajero_nombre}`);
      if (venta.mesero_nombre) {
        printer.println(`Mesero: ${venta.mesero_nombre}`);
      }
      printer.println(`Cliente: ${venta.cliente_nombre}`);
      if (venta.cliente_documento) printer.println(`CC/NIT: ${venta.cliente_documento}`);
      printer.drawLine();

      printer.tableCustom([
        { text: "CANT", align: "LEFT", width: 0.12 },
        { text: "DESCRIPCION", align: "LEFT", width: 0.53 },
        { text: "TOTAL", align: "RIGHT", width: 0.35 }
      ]);
      printer.drawLine();

      for (const item of items) {
        printer.tableCustom([
          { text: parseFloat(item.cantidad).toString(), align: "LEFT", width: 0.12 },
          { text: (item.producto_nombre || "").substring(0, 22), align: "LEFT", width: 0.53 },
          { text: this.formatCurrency(item.subtotal), align: "RIGHT", width: 0.35 }
        ]);

        let mods = item.modificadores;
        if (typeof mods === 'string') {
          try { mods = JSON.parse(mods); } catch(e) { mods = []; }
        }

        if (Array.isArray(mods) && mods.length > 0) {
          printer.setTextNormal();
          
          const modsAgrupados = mods.reduce((acc: any, mod: any) => {
            const name = mod.nombre || mod;
            if (!acc[name]) acc[name] = { ...mod, _cantidad: 1 };
            else acc[name]._cantidad += 1;
            return acc;
          }, {});

          for (const key in modsAgrupados) {
            const mod = modsAgrupados[key];
            const modName = mod.nombre || key;
            const precioExtra = parseFloat(mod.precio_extra || 0);
            const prefix = mod._cantidad > 1 ? `${mod._cantidad}x ` : '';
            
            if (precioExtra > 0) {
              const totalPrecioExtra = precioExtra * mod._cantidad;
              const textoMod = `  -> ${prefix}${modName} (+${this.formatCurrency(totalPrecioExtra)})`;
              printer.println(textoMod.substring(0, 42)); 
            } else {
              printer.println(`  -> ${prefix}${modName}`.substring(0, 42)); 
            }
          }
        }
      }
      printer.drawLine();

      printer.leftRight("SUBTOTAL:", this.formatCurrency(venta.subtotal));
      
      if (parseFloat(venta.descuento) > 0) printer.leftRight("DESCUENTO:", `-${this.formatCurrency(venta.descuento)}`);
      if (parseFloat(venta.impuestos) > 0) printer.leftRight("IMPUESTOS:", this.formatCurrency(venta.impuestos));
      if (parseFloat(venta.propina) > 0) printer.leftRight("PROPINA:", this.formatCurrency(venta.propina));
      
      const totalFinal = parseFloat(venta.total) + parseFloat(venta.propina);
      printer.drawLine();
      
      printer.bold(true);
      printer.leftRight("TOTAL A PAGAR:", this.formatCurrency(totalFinal));
      printer.bold(false);
      
      printer.drawLine();

      printer.alignCenter();
      printer.println("METODOS DE PAGO");
      
      for (const pago of pagos) {
        const metodoLimpiado = pago.metodo_pago.toUpperCase().replace('_', ' ');
        printer.leftRight(metodoLimpiado, this.formatCurrency(pago.monto));
      }

      if (parseFloat(venta.cambio) > 0) {
        printer.bold(true);
        printer.leftRight("CAMBIO:", this.formatCurrency(venta.cambio));
        printer.bold(false);
      }
      printer.drawLine();

      printer.alignCenter();
      printer.println("¡Gracias por su compra!");
      printer.cut();
      printer.openCashDrawer();

      await printer.execute();
      
      console.log(`✅ ¡Datos enviados con éxito a la impresora!`);
      console.log(`========================================\n`);
    } catch (error) {
      console.error('❌ ERROR FATAL en la impresión:', error);
    }
  }
}