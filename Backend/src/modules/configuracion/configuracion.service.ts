import { query } from '../../config/database';

export class ConfiguracionService {
  static async obtenerTodo() {
    const res = await query('SELECT clave, valor, descripcion, tipo FROM configuracion');
    return res.rows;
  }

  static async actualizar(ajustes: { clave: string; valor: string }[]) {
    for (const ajuste of ajustes) {
      await query(
        'UPDATE configuracion SET valor = $1, updated_at = NOW() WHERE clave = $2',
        [ajuste.valor, ajuste.clave]
      );
    }
  }
}