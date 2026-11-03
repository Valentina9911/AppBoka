import { Request, Response } from 'express';
import { ModificadoresService } from './modificadores.service';

export class ModificadoresController {
  
  static async crearGrupo(req: Request, res: Response) {
    const grupo = await ModificadoresService.crearGrupo(req.body);
    res.status(201).json({ success: true, data: grupo });
  }

  static async obtenerGrupos(req: Request, res: Response) {
    const grupos = await ModificadoresService.obtenerGrupos();
    res.status(200).json({ success: true, data: grupos });
  }

  static async eliminarGrupo(req: Request, res: Response) {
    const { id } = req.params;
    const result = await ModificadoresService.eliminarGrupo(id);
    res.status(200).json({ success: true, message: result.message });
  }

  static async agregarModificador(req: Request, res: Response) {
    const { grupoId } = req.params;
    const modificador = await ModificadoresService.agregarModificador(grupoId, req.body);
    res.status(201).json({ success: true, data: modificador });
  }

  static async eliminarModificador(req: Request, res: Response) {
    const { id } = req.params;
    const result = await ModificadoresService.eliminarModificador(id);
    res.status(200).json({ success: true, message: result.message });
  }

  static async vincularGruposAProducto(req: Request, res: Response) {
    const { productoId } = req.params;
    const { gruposIds } = req.body; // Array de IDs de los grupos
    const result = await ModificadoresService.vincularGruposAProducto(productoId, gruposIds);
    res.status(200).json({ success: true, message: result.message });
  }
  static async obtenerVinculosProducto(req: Request, res: Response) {
    try {
      const { productoId } = req.params;
      const gruposIds = await ModificadoresService.obtenerVinculosProducto(productoId);
      res.status(200).json({ success: true, data: gruposIds });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}