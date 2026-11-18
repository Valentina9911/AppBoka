import { Request, Response } from 'express';
import { CajaService } from './caja.service';
import { PrinterService } from '../printer/printer.service';
import { AuthRequest } from '../../types';
import { AppError } from '../../utils/AppError';

export class CajaController {
  static async abrirTurno(req: AuthRequest, res: Response): Promise<void> {
    if (!req.usuario) throw new AppError('No autenticado', 401);
    const montoApertura = Number(req.body.monto_apertura);
    const cajaId = Number(req.body.caja_id);

    if (isNaN(montoApertura) || montoApertura < 0) throw new AppError('Monto de apertura inválido', 400);
    if (!cajaId || isNaN(cajaId)) throw new AppError('Debe seleccionar una caja', 400);

    const turno = await CajaService.abrirTurno(req.usuario.id, montoApertura, cajaId);
    res.status(201).json({ success: true, message: 'Turno abierto', data: turno, statusCode: 201 });
  }

  static async obtenerActual(req: AuthRequest, res: Response): Promise<void> {
    if (!req.usuario) throw new AppError('No autenticado', 401);
    const turno = await CajaService.obtenerTurnoActual(req.usuario.id);
    res.status(200).json({ success: true, message: turno ? 'Turno activo' : 'Sin turno', data: turno, statusCode: 200 });
  }

  static async obtenerCajas(req: AuthRequest, res: Response) {
    try {
      const cajas = await CajaService.obtenerCajas();
      res.status(200).json({ success: true, data: cajas });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error' });
    }
  }

  static async registrarMovimiento(req: AuthRequest, res: Response): Promise<void> {
    if (!req.usuario) throw new AppError('No autenticado', 401);
    const { tipo, monto, descripcion } = req.body;
    if (!tipo || !monto || !descripcion) throw new AppError('Datos requeridos', 400);
    const mov = await CajaService.registrarMovimiento(req.usuario.id, tipo, Number(monto), descripcion);
    res.status(201).json({ success: true, message: 'Movimiento registrado', data: mov, statusCode: 201 });
  }

  static async cerrarTurno(req: AuthRequest, res: Response): Promise<void> {
    if (!req.usuario) throw new AppError('No autenticado', 401);
    const montoCierreReal = Number(req.body.monto_cierre_real);
    if (isNaN(montoCierreReal) || montoCierreReal < 0) throw new AppError('Monto inválido', 400);
    const turnoCerrado = await CajaService.cerrarTurno(req.usuario.id, montoCierreReal, req.body.notas_cierre);
    res.status(200).json({ success: true, message: 'Turno cerrado', data: turnoCerrado, statusCode: 200 });
  }
  
  static async imprimirReporteFisico(req: AuthRequest, res: Response): Promise<void> {
    if (!req.usuario) throw new AppError('No autenticado', 401);
    const { tipo, turno, opciones } = req.body;
    PrinterService.imprimirReporteCaja(turno, tipo, opciones).catch(console.error);
    res.status(200).json({ success: true, message: 'Reporte enviado a impresora', statusCode: 200 });
  }

  static async obtenerHistorial(req: AuthRequest, res: Response) {
    try {
      const historial = await CajaService.obtenerHistorialCierres();
      res.status(200).json({ success: true, data: historial });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async reimprimirZ(req: AuthRequest, res: Response) {
    try {
      const turnoId = req.params.id; 
      
      const turnoCompleto = await CajaService.reconstruirTurnoCerrado(turnoId);
      PrinterService.imprimirReporteCaja(turnoCompleto, 'Z', { incluir_movimientos: true, incluir_productos: true }).catch(console.error);
      res.status(200).json({ success: true, message: 'Reporte Z enviado a la impresora' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }
}