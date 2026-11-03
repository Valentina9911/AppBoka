import { Request, Response, NextFunction } from 'express';
import { ProductosService } from './productos.service';

export class ProductosController {
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const productos = await ProductosService.listarActivos();
      res.json({ success: true, data: productos, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const producto = await ProductosService.crear(req.body);
      res.status(201).json({ success: true, data: producto, statusCode: 201 });
    } catch (error) { next(error); }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const producto = await ProductosService.actualizar(req.params.id, req.body);
      res.json({ success: true, data: producto, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async listarCategorias(req: Request, res: Response, next: NextFunction) {
    try {
      const categorias = await ProductosService.listarCategorias();
      res.json({ success: true, data: categorias, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async crearCategoria(req: Request, res: Response, next: NextFunction) {
    try {
      const categoria = await ProductosService.crearCategoria(req.body);
      res.status(201).json({ success: true, data: categoria, statusCode: 201 });
    } catch (error) { next(error); }
  }

  static async actualizarCategoria(req: Request, res: Response, next: NextFunction) {
    try {
      const categoria = await ProductosService.actualizarCategoria(req.params.id, req.body);
      res.json({ success: true, data: categoria, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async eliminarCategoria(req: Request, res: Response, next: NextFunction) {
    try {
      await ProductosService.eliminarCategoria(req.params.id);
      res.json({ success: true, message: 'Categoría eliminada', statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async obtenerReceta(req: Request, res: Response, next: NextFunction) {
    try {
      const receta = await ProductosService.obtenerReceta(req.params.id);
      res.json({ success: true, data: receta, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async agregarIngrediente(req: Request, res: Response, next: NextFunction) {
    try {
      const ingrediente = await ProductosService.agregarIngredienteReceta(req.params.id, req.body);
      res.status(201).json({ success: true, data: ingrediente, statusCode: 201 });
    } catch (error) { next(error); }
  }

  static async eliminarIngrediente(req: Request, res: Response, next: NextFunction) {
    try {
      await ProductosService.eliminarIngredienteReceta(req.params.id, req.params.ingredienteId);
      res.json({ success: true, message: 'Ingrediente eliminado', statusCode: 200 });
    } catch (error) { next(error); }
  }
}