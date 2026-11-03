import { Router } from 'express';
import { ModificadoresController } from './modificadores.controller';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.post('/grupos', asyncHandler(ModificadoresController.crearGrupo));

router.get('/grupos', asyncHandler(ModificadoresController.obtenerGrupos));

router.delete('/grupos/:id', asyncHandler(ModificadoresController.eliminarGrupo));


router.post('/grupos/:grupoId/opciones', asyncHandler(ModificadoresController.agregarModificador));

router.delete('/opciones/:id', asyncHandler(ModificadoresController.eliminarModificador));


router.post('/vincular/:productoId', asyncHandler(ModificadoresController.vincularGruposAProducto));

router.post('/vincular/:productoId', ModificadoresController.vincularGruposAProducto);
router.get('/vincular/:productoId', ModificadoresController.obtenerVinculosProducto);

export default router;