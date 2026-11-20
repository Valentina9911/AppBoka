import { Request, Response } from 'express';
import { MesasService } from './mesas.service';
import { ApiResponse } from '../../types';
import { AppError } from '../../utils/AppError';

export class MesasController {
  static async listar(req: Request, res: Response): Promise<void> {
    const { estado } = req.query;
    const mesas = estado && typeof estado === 'string'
      ? await MesasService.listarPorEstado(estado)
      : await MesasService.listarConEstado();
    res.status(200).json({ success: true, message: `${mesas.length} mesa(s)`, data: mesas, statusCode: 200 });
  }

  static async obtener(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const mesa = await MesasService.obtenerPorId(id);
    if (!mesa) throw new AppError('Mesa no encontrada', 404);
    res.status(200).json({ success: true, message: 'Mesa obtenida', data: mesa, statusCode: 200 });
  }

  static async cambiarEstado(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const { estado } = req.body;
    if (!estado) throw new AppError('Estado requerido', 400);
    const mesa = await MesasService.cambiarEstado(id, estado);
    res.status(200).json({ success: true, message: 'Estado actualizado', data: mesa, statusCode: 200 });
  }

  static async crear(req: Request, res: Response): Promise<void> {
    const mesa = await MesasService.crear(req.body);
    res.status(201).json({ success: true, message: 'Mesa creada', data: mesa, statusCode: 201 });
  }

  static async actualizar(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const mesa = await MesasService.actualizar(id, req.body);
    res.status(200).json({ success: true, message: 'Mesa actualizada', data: mesa, statusCode: 200 });
  }

  static async eliminar(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    await MesasService.eliminar(id);
    res.status(200).json({ success: true, message: 'Mesa eliminada', statusCode: 200 });
  }
}