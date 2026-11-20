
import { Request, Response } from 'express';
import { CuentasService } from './cuentas.service';
import { AuthRequest } from '../../types';
import { AppError } from '../../utils/AppError';
import { PrinterService } from '../printer/printer.service';

export class CuentasController {
  
  static async crear(req: AuthRequest, res: Response): Promise<void> {
    if (!req.usuario) throw new AppError('No autenticado', 401);
    const cuenta = await CuentasService.crearCuenta(req.body, req.usuario.id);
    res.status(201).json({ success: true, message: 'Cuenta creada y mesa ocupada', data: cuenta, statusCode: 201 });
  }

  static async obtener(req: Request, res: Response): Promise<void> {
    const cuentaId = req.params.id;
    const datos = await CuentasService.obtenerCuenta(cuentaId);
    res.status(200).json({ success: true, message: 'Cuenta obtenida', data: datos, statusCode: 200 });
  }

  static async obtenerEnEspera(req: Request, res: Response): Promise<void> {
    const cuentas = await CuentasService.obtenerCuentasEnEspera();
    res.status(200).json({ success: true, data: cuentas, statusCode: 200 });
  }

  static async agregarItem(req: Request, res: Response): Promise<void> {
    const cuentaId = req.params.id;
    await CuentasService.agregarItem(cuentaId, req.body);
    res.status(201).json({ success: true, message: 'Producto agregado a la orden', statusCode: 201 });
  }

  static async agregarItemsBulk(req: Request, res: Response): Promise<void> {
    const cuentaId = req.params.id;
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      throw new AppError('El payload debe contener un arreglo de items', 400);
    }
    await CuentasService.agregarItemsBulk(cuentaId, items);
    res.status(201).json({ success: true, message: 'Productos sincronizados exitosamente', statusCode: 201 });
  }

  static async actualizarItem(req: Request, res: Response): Promise<void> {
    const cuentaId = req.params.id;
    const itemId = req.params.itemId;
    const { cantidad } = req.body;
    if (!cantidad) throw new AppError('La cantidad es requerida', 400);
    await CuentasService.actualizarItem(cuentaId, itemId, Number(cantidad));
    res.status(200).json({ success: true, message: 'Cantidad actualizada', statusCode: 200 });
  }

  static async eliminarItem(req: Request, res: Response): Promise<void> {
    const cuentaId = req.params.id;
    const itemId = req.params.itemId;
    await CuentasService.eliminarItem(cuentaId, itemId);
    res.status(200).json({ success: true, message: 'Producto cancelado de la orden', statusCode: 200 });
  }

  static async transferirMesa(req: Request, res: Response): Promise<void> {
    const cuentaId = req.params.id;
    const { nueva_mesa_id } = req.body;
    if (!nueva_mesa_id) throw new AppError('El ID de la nueva mesa es requerido', 400);
    await CuentasService.transferirMesa(cuentaId, Number(nueva_mesa_id));
    res.status(200).json({ success: true, message: 'Mesa transferida exitosamente', statusCode: 200 });
  }

  static async unirCuentas(req: Request, res: Response): Promise<void> {
    const cuentaId = req.params.id;
    const { cuenta_destino_id } = req.body;
    if (!cuenta_destino_id) throw new AppError('El ID de la cuenta destino es requerido', 400);
    await CuentasService.unirCuentas(cuentaId, cuenta_destino_id);
    res.status(200).json({ success: true, message: 'Cuentas unidas exitosamente', statusCode: 200 });
  }

  static async dividirCuenta(req: AuthRequest, res: Response): Promise<void> {
    if (!req.usuario) throw new AppError('No autenticado', 401);
    const cuentaId = req.params.id;
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Se requieren los ítems a dividir', 400);
    }
    const nuevaCuentaId = await CuentasService.dividirCuenta(cuentaId, items, req.usuario.id);
    res.status(200).json({ success: true, message: 'Cuenta dividida exitosamente', data: { nueva_cuenta_id: nuevaCuentaId }, statusCode: 200 });
  }

  static async enviarComandaCocina(req: Request, res: Response) {
    const { id } = req.params;
    PrinterService.imprimirComanda(id).catch(err => {
      console.error('Error al enviar ticket a cocina', err);
    });
    res.status(200).json({ success: true, message: 'Orden enviada a cocina exitosamente' });
  }
}