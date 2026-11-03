import { Router } from 'express';
import { CategoriasController } from './categorias.controller';
import { autenticar } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.use(autenticar);

router.get('/', asyncHandler(CategoriasController.obtener));
router.post('/', asyncHandler(CategoriasController.crear));
router.delete('/:id', asyncHandler(CategoriasController.eliminar));

router.patch('/:id/cocina', asyncHandler(CategoriasController.toggleCocina));

export default router;