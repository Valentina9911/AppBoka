import { query } from '../../config/database';
import { AppError } from '../../utils/AppError';

export class ProductosService {
  static async listarActivos() {
    const resultado = await query(
      `SELECT p.*, c.nombre as cat 
       FROM productos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       WHERE p.activo = true 
       ORDER BY c.nombre, p.nombre`
    );
    return resultado.rows;
  }

  static async crear(data: any) {
    const { nombre, categoria_id, precio_venta, stock_actual, tipo } = data;
    const resultado = await query(
      `INSERT INTO productos (nombre, categoria_id, precio_venta, stock_actual, tipo)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre, categoria_id || null, precio_venta, stock_actual || 0, tipo || 'simple']
    );
    return resultado.rows[0];
  }

  static async actualizar(id: string, data: any) {
    const { nombre, categoria_id, precio_venta, stock_actual, tipo } = data;
    const resultado = await query(
      `UPDATE productos 
       SET nombre = COALESCE($1, nombre), 
           categoria_id = COALESCE($2, categoria_id), 
           precio_venta = COALESCE($3, precio_venta), 
           stock_actual = COALESCE($4, stock_actual),
           tipo = COALESCE($5, tipo),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [nombre, categoria_id || null, precio_venta, stock_actual, tipo, id]
    );
    return resultado.rows[0];
  }

  static async listarCategorias() {
    const resultado = await query(
      `SELECT id, nombre, descripcion FROM categorias WHERE activo = true ORDER BY nombre`
    );
    return resultado.rows;
  }

  static async crearCategoria(data: any) {
    const { nombre, descripcion } = data;
    const resultado = await query(
      `INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *`,
      [nombre, descripcion || null]
    );
    return resultado.rows[0];
  }

  static async actualizarCategoria(id: string, data: any) {
    const { nombre, descripcion } = data;
    const resultado = await query(
      `UPDATE categorias SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [nombre, descripcion, id]
    );
    return resultado.rows[0];
  }

  static async eliminarCategoria(id: string) {
    const resultado = await query(
      `UPDATE categorias SET activo = false, updated_at = NOW() WHERE id = $1 RETURNING *`, 
      [id]
    );
    return resultado.rows[0];
  }

  static async obtenerReceta(productoId: string) {
    const resultado = await query(
      `SELECT ri.*, p.nombre as ingrediente_nombre 
       FROM receta_ingredientes ri
       JOIN productos p ON ri.ingrediente_id = p.id
       WHERE ri.producto_id = $1`,
      [productoId]
    );
    return resultado.rows;
  }

  static async agregarIngredienteReceta(productoId: string, data: any) {
    const { ingrediente_id, cantidad, unidad_medida, notas } = data;
    
    if (productoId === ingrediente_id) {
       throw new AppError('Un producto no puede ser ingrediente de sí mismo', 400);
    }

    const resultado = await query(
      `INSERT INTO receta_ingredientes (producto_id, ingrediente_id, cantidad, unidad_medida, notas)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (producto_id, ingrediente_id) 
       DO UPDATE SET cantidad = EXCLUDED.cantidad, unidad_medida = EXCLUDED.unidad_medida, notas = EXCLUDED.notas
       RETURNING *`,
      [productoId, ingrediente_id, cantidad, unidad_medida || 'gramos', notas || null]
    );
    return resultado.rows[0];
  }

  static async eliminarIngredienteReceta(productoId: string, ingredienteId: string) {
    await query(
      `DELETE FROM receta_ingredientes WHERE producto_id = $1 AND ingrediente_id = $2`, 
      [productoId, ingredienteId]
    );
  }
}