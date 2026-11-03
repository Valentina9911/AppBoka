import { Router } from 'express';
import { ProductosController } from './productos.controller';
import { autenticar } from '../../middlewares/auth.middleware';

const router = Router();

router.use(autenticar);

router.get('/categorias', ProductosController.listarCategorias);
router.post('/categorias', ProductosController.crearCategoria);
router.put('/categorias/:id', ProductosController.actualizarCategoria);
router.delete('/categorias/:id', ProductosController.eliminarCategoria);

router.get('/', ProductosController.listar);
router.post('/', ProductosController.crear);
router.put('/:id', ProductosController.actualizar);

router.get('/:id/receta', ProductosController.obtenerReceta);
router.post('/:id/receta', ProductosController.agregarIngrediente);
router.delete('/:id/receta/:ingredienteId', ProductosController.eliminarIngrediente);

export default router;