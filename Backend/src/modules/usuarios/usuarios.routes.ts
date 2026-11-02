import { Router } from 'express';
import { UsuariosController } from './usuarios.controller';
import { autenticar } from '../../middlewares/auth.middleware';
import { autorizar } from '../../middlewares/rbac.middleware';

const router = Router();

router.use(autenticar);

router.get('/permisos', autorizar('roles:editar'), UsuariosController.listarPermisos);

router.get('/roles', autorizar('roles:ver'), UsuariosController.listarRoles);
router.post('/roles', autorizar('roles:crear'), UsuariosController.crearRol);
router.get('/roles/:id/permisos', autorizar('roles:ver'), UsuariosController.obtenerPermisosRol);
router.put('/roles/:id/permisos', autorizar('roles:editar'), UsuariosController.actualizarPermisosRol);

router.get('/', autorizar('usuarios:ver'), UsuariosController.listar);
router.put('/:id', autorizar('usuarios:editar'), UsuariosController.actualizar);
router.delete('/:id', autorizar('usuarios:editar'), UsuariosController.eliminar);
router.put('/:id/roles', autorizar('usuarios:editar'), UsuariosController.actualizarRolesUsuario);

export default router;