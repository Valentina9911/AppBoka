
import { Router } from 'express';
import { ClientesController } from './clientes.controller';
import { autenticar } from '../../middlewares/auth.middleware';
import { autorizar } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.get('/', autenticar, autorizar('clientes:ver'), asyncHandler(ClientesController.listar));

router.get('/buscar', autenticar, autorizar('clientes:ver'), asyncHandler(ClientesController.buscarPorTelefono));

router.post('/', autenticar, autorizar('clientes:crear'), asyncHandler(ClientesController.crear));

export default router;
