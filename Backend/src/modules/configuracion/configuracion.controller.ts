import { Request, Response } from 'express';
import { ConfiguracionService } from './configuracion.service';

export class ConfiguracionController {
  static async obtener(req: Request, res: Response) {
    const ajustes = await ConfiguracionService.obtenerTodo();
    res.json({ success: true, data: ajustes, statusCode: 200 });
  }

  static async actualizar(req: Request, res: Response) {
    await ConfiguracionService.actualizar(req.body.ajustes);
    res.json({ success: true, message: 'Configuración guardada exitosamente', statusCode: 200 });
  }
}