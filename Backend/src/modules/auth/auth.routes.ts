
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { autenticar } from '../../middlewares/auth.middleware';
import { autorizar } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.post('/login', asyncHandler(AuthController.login));

router.post(
  '/registrar',
  autenticar,
  autorizar('usuarios:crear'),
  asyncHandler(AuthController.registrar)
);

router.get('/perfil', autenticar, asyncHandler(AuthController.perfil));

export default router;
