import { Router } from 'express';
import { ConfiguracionController } from './configuracion.controller';
import { autenticar } from '../../middlewares/auth.middleware';
import { autorizar } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.get('/', autenticar, asyncHandler(ConfiguracionController.obtener));
router.put('/', autenticar, autorizar('configuracion:editar'), asyncHandler(ConfiguracionController.actualizar));

export default router;