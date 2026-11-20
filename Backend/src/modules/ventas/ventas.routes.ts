
import { Router } from 'express';
import { VentasController } from './ventas.controller';
import { autenticar } from '../../middlewares/auth.middleware';
import { autorizar } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.get('/', autenticar, autorizar('ventas:ver'), asyncHandler(VentasController.listarDelDia));
router.get('/del-dia', autenticar, autorizar('ventas:ver'), asyncHandler(VentasController.obtenerDelDia));
router.post('/pagar', autenticar, autorizar('ventas:crear'), asyncHandler(VentasController.pagar));
router.post('/pago-rapido', autenticar, autorizar('ventas:crear'), asyncHandler(VentasController.pagoRapido));
router.post('/verificar-admin', autenticar, asyncHandler(VentasController.verificarAdmin));

router.get('/:id', autenticar, autorizar('ventas:ver'), asyncHandler(VentasController.obtener));
router.post('/:id/imprimir', autenticar, autorizar('ventas:ver'), asyncHandler(VentasController.imprimirTicketFisico));
router.patch('/:id/pago', autenticar, autorizar('ventas:editar'), asyncHandler(VentasController.cambiarPago));
router.post('/:id/anular', autenticar, asyncHandler(VentasController.anular));


export default router;