import { query } from '../../config/database';
import { AppError } from '../../utils/AppError';

export class CategoriasService {
  static async obtenerTodas() {
    const result = await query('SELECT * FROM categorias ORDER BY nombre ASC');
    return result.rows;
  }

  static async crear(nombre: string, enviar_cocina: boolean = true) {
    const result = await query(
      'INSERT INTO categorias (nombre, enviar_cocina) VALUES ($1, $2) RETURNING *', 
      [nombre, enviar_cocina]
    );
    return result.rows[0];
  }

  static async eliminar(id: string) {
    await query('DELETE FROM categorias WHERE id = $1', [id]);
  }

  static async toggleCocina(id: string, enviar_cocina: boolean) {
    const result = await query(
      'UPDATE categorias SET enviar_cocina = $1 WHERE id = $2 RETURNING *', 
      [enviar_cocina, id]
    );
    if (result.rows.length === 0) throw new AppError('Categoría no encontrada', 404);
    return result.rows[0];
  }
}