import { Request, Response, NextFunction } from 'express';
import { UsuariosService } from './usuarios.service';

export class UsuariosController {
  
  static async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarios = await UsuariosService.listarActivos();
      res.json({ success: true, data: usuarios, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await UsuariosService.actualizar(req.params.id, req.body);
      res.json({ success: true, data: usuario, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      await UsuariosService.eliminar(req.params.id);
      res.json({ success: true, message: 'Usuario desactivado', statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async actualizarRolesUsuario(req: Request, res: Response, next: NextFunction) {
    try {
      const { rol_ids } = req.body;
      await UsuariosService.actualizarRolesUsuario(req.params.id, rol_ids);
      res.json({ success: true, message: 'Roles actualizados correctamente', statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async listarRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await UsuariosService.listarRoles();
      res.json({ success: true, data: roles, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async crearRol(req: Request, res: Response, next: NextFunction) {
    try {
      const rol = await UsuariosService.crearRol(req.body);
      res.status(201).json({ success: true, data: rol, statusCode: 201 });
    } catch (error) { next(error); }
  }

  static async listarPermisos(req: Request, res: Response, next: NextFunction) {
    try {
      const permisos = await UsuariosService.listarPermisos();
      res.json({ success: true, data: permisos, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async obtenerPermisosRol(req: Request, res: Response, next: NextFunction) {
    try {
      const permisos = await UsuariosService.obtenerPermisosRol(req.params.id);
      res.json({ success: true, data: permisos, statusCode: 200 });
    } catch (error) { next(error); }
  }

  static async actualizarPermisosRol(req: Request, res: Response, next: NextFunction) {
    try {
      const { permisos_ids } = req.body;
      await UsuariosService.actualizarPermisosRol(req.params.id, permisos_ids);
      res.json({ success: true, message: 'Permisos actualizados correctamente', statusCode: 200 });
    } catch (error) { next(error); }
  }
}