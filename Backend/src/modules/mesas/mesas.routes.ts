import { Router } from 'express';
import { MesasController } from './mesas.controller';
import { autenticar } from '../../middlewares/auth.middleware';
import { autorizar } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.use(autenticar);

router.get('/', autorizar('mesas:ver'), asyncHandler(MesasController.listar));
router.get('/:id', autorizar('mesas:ver'), asyncHandler(MesasController.obtener));
router.patch('/:id/estado', autorizar('mesas:cambiar_estado'), asyncHandler(MesasController.cambiarEstado));

router.post('/', autorizar('mesas:editar'), asyncHandler(MesasController.crear));
router.put('/:id', autorizar('mesas:editar'), asyncHandler(MesasController.actualizar));
router.delete('/:id', autorizar('mesas:editar'), asyncHandler(MesasController.eliminar));

export default router;