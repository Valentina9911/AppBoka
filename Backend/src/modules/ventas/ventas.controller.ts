
import { Request, Response } from 'express';
import { VentasService } from './ventas.service';
import { AuthRequest } from '../../types';
import { AppError } from '../../utils/AppError';
import { PrinterService } from '../printer/printer.service';
import { query } from '../../config/database';
import bcrypt from 'bcryptjs';

export class VentasController {
  static async pagar(req: AuthRequest, res: Response): Promise<void> {
    if (!req.usuario) throw new AppError('No autenticado', 401);
    
    const resultado = await VentasService.pagarCuenta(req.body, req.usuario.id);

    if (req.body.imprimir_ticket !== false) {
      PrinterService.imprimirFactura(resultado.venta.id).catch(err => {
        console.error('Error al imprimir ticket post-venta:', err);
      });
    }

    res.status(201).json({
      success: true,
      message: `Venta #${resultado.venta.numero_factura} registrada exitosamente. Cambio: $${resultado.cambio.toFixed(2)}`,
      data: resultado,
      statusCode: 201,
    });
  }

  static async obtener(req: AuthRequest, res: Response): Promise<void> {
    const ventaId = req.params.id as string;
    const resultado = await VentasService.obtenerVenta(ventaId);
    res.status(200).json({ success: true, message: 'Venta obtenida', data: resultado, statusCode: 200 });
  }

  static async listarDelDia(req: AuthRequest, res: Response): Promise<void> {
    const turnoId = req.query.turno_id as string | undefined;
    const ventas = await VentasService.listarDelDia(turnoId);
    res.status(200).json({ success: true, message: `${ventas.length} venta(s) del día`, data: ventas, statusCode: 200 });
  }

  static async pagoRapido(req: AuthRequest, res: Response, next: any): Promise<void> {
    try {
      if (!req.usuario) throw new AppError('No autenticado', 401);
      const resultado = await VentasService.pagoRapido(req.body, req.usuario.id);
      
      if (req.body.imprimir_ticket !== false) {
        PrinterService.imprimirFactura(resultado.venta.id).catch(console.error);
      }

      res.status(201).json({ success: true, message: 'Pago rápido procesado', data: resultado, statusCode: 201 });
    } catch (error) { next(error); }
  }

  static async imprimirTicketFisico(req: AuthRequest, res: Response): Promise<void> {
    await PrinterService.imprimirFactura(req.params.id);
    res.status(200).json({ success: true, message: 'Ticket enviado a la impresora', statusCode: 200 });
  }

  static async obtenerDelDia(req: Request, res: Response) {
    try {
      const ventas = await VentasService.obtenerUltimasVentas();
      res.status(200).json({ success: true, data: ventas });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async cambiarPago(req: AuthRequest, res: Response) {
    try {
      const { pago_id, nuevo_metodo } = req.body;
      if (!pago_id || !nuevo_metodo) throw new AppError('Faltan el ID del pago o el nuevo método', 400);

      await VentasService.cambiarMetodoPago(pago_id, nuevo_metodo);
      res.status(200).json({ success: true, message: 'Método de pago actualizado en caja' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async anular(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { password, motivo } = req.body;
      if (!req.usuario) throw new AppError('No autenticado', 401);

      const adminRes = await query(`
        SELECT u.id, u.password_hash 
        FROM usuarios u
        JOIN usuario_roles ur ON u.id = ur.usuario_id
        JOIN roles r ON ur.rol_id = r.id
        WHERE r.nombre IN ('Super Admin', 'Administrador', 'admin') AND u.activo = TRUE
      `);

      let adminValido = false;
      let adminIdQueAutoriza = req.usuario.id;

      for (const admin of adminRes.rows) {
        const isValid = await bcrypt.compare(password, admin.password_hash);
        if (isValid) {
          adminValido = true;
          adminIdQueAutoriza = admin.id;
          break;
        }
      }

      if (!adminValido) {
        throw new AppError('Clave de autorización incorrecta o no tiene privilegios de administrador.', 403);
      }

      await VentasService.anularVenta(id, adminIdQueAutoriza, motivo || 'Corrección de error');
      res.status(200).json({ success: true, message: 'Venta anulada. Inventario y Caja recalculados.' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async verificarAdmin(req: AuthRequest, res: Response): Promise<void> {
    const { password } = req.body;
    if (!password) {
      throw new AppError('La contraseña o PIN de autorización es obligatorio', 400);
    }

    const adminRes = await query(`
      SELECT u.nombre_completo, u.password_hash 
      FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE r.nombre IN ('Super Admin', 'Administrador', 'admin') AND u.activo = TRUE
    `);

    let esValido = false;
    let nombreAdmin = '';

    for (const admin of adminRes.rows) {
      const match = await bcrypt.compare(password, admin.password_hash);
      if (match) {
        esValido = true;
        nombreAdmin = admin.nombre_completo;
        break;
      }
    }

    if (!esValido) {
      throw new AppError('Clave de administrador incorrecta o el usuario no posee privilegios.', 403);
    }

    res.status(200).json({
      success: true,
      message: `Autorización concedida por ${nombreAdmin}`,
      data: { autorizado: true, nombre: nombreAdmin }
    });
  }
}