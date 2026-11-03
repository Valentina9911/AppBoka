import { Request, Response } from 'express';
import { CategoriasService } from './categorias.service';

export class CategoriasController {
  static async obtener(req: Request, res: Response) {
    const categorias = await CategoriasService.obtenerTodas();
    res.status(200).json({ success: true, data: categorias, statusCode: 200 });
  }

  static async crear(req: Request, res: Response) {
    const { nombre, enviar_cocina } = req.body;
    const categoria = await CategoriasService.crear(nombre, enviar_cocina);
    res.status(201).json({ success: true, data: categoria, statusCode: 201 });
  }

  static async eliminar(req: Request, res: Response) {
    await CategoriasService.eliminar(req.params.id);
    res.status(200).json({ success: true, message: 'Categoría eliminada', statusCode: 200 });
  }

  static async toggleCocina(req: Request, res: Response) {
    const { enviar_cocina } = req.body;
    const categoria = await CategoriasService.toggleCocina(req.params.id, enviar_cocina);
    res.status(200).json({ success: true, data: categoria, message: 'Configuración actualizada', statusCode: 200 });
  }
}