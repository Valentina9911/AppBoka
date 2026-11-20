
import { Router } from 'express';
import { CuentasController } from './cuentas.controller';
import { autenticar } from '../../middlewares/auth.middleware';
import { autorizar } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.use(autenticar);

router.post('/', autorizar('ventas:crear'), asyncHandler(CuentasController.crear));

router.get('/espera', autorizar('ventas:ver'), asyncHandler(CuentasController.obtenerEnEspera));

router.get('/:id', autorizar('ventas:ver'), asyncHandler(CuentasController.obtener));

router.post('/:id/items/bulk', autorizar('ventas:crear'), asyncHandler(CuentasController.agregarItemsBulk));

router.post('/:id/items', autorizar('ventas:crear'), asyncHandler(CuentasController.agregarItem));
router.patch('/:id/items/:itemId', autorizar('ventas:editar'), asyncHandler(CuentasController.actualizarItem));
router.delete('/:id/items/:itemId', autorizar('ventas:editar'), asyncHandler(CuentasController.eliminarItem));

router.post('/:id/transferir', autorizar('ventas:editar'), asyncHandler(CuentasController.transferirMesa));
router.post('/:id/unir', autorizar('ventas:editar'), asyncHandler(CuentasController.unirCuentas));
router.post('/:id/dividir', autorizar('ventas:editar'), asyncHandler(CuentasController.dividirCuenta));
router.post('/:id/imprimir-comanda', autenticar, asyncHandler(CuentasController.enviarComandaCocina));

export default router;