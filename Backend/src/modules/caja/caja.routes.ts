import { Router } from 'express';
import { CajaController } from './caja.controller';
import { autenticar } from '../../middlewares/auth.middleware';
import { autorizar } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.use(autenticar);

router.get('/actual', autorizar('caja:abrir_turno'), asyncHandler(CajaController.obtenerActual));
router.get('/lista-cajas', autorizar('caja:abrir_turno'), asyncHandler(CajaController.obtenerCajas));
router.get('/historial', autorizar('caja:abrir_turno'), asyncHandler(CajaController.obtenerHistorial));
router.post('/abrir', autorizar('caja:abrir_turno'), asyncHandler(CajaController.abrirTurno));
router.post('/cerrar', autorizar('caja:cerrar_turno'), asyncHandler(CajaController.cerrarTurno));
router.post('/historial/:id/reimprimir', autorizar('caja:abrir_turno'), asyncHandler(CajaController.reimprimirZ));

router.post('/imprimir-reporte', autorizar('caja:abrir_turno'), asyncHandler(CajaController.imprimirReporteFisico));
router.post('/movimiento', autorizar('caja:abrir_turno'), asyncHandler(CajaController.registrarMovimiento));


export default router;