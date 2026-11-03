
import { query } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { Cliente, CrearClienteDTO } from '../../types';

export class ClientesService {
  /**
   * Busca clientes por teléfono (búsqueda parcial con LIKE).
   * Endpoint optimizado para búsqueda rápida en el punto de venta.
   */
  static async buscarPorTelefono(telefono: string): Promise<Cliente[]> {
    if (!telefono || telefono.trim().length < 3) {
      throw new AppError('Ingrese al menos 3 dígitos del teléfono para buscar', 400);
    }

    const resultado = await query(
      `SELECT id, cedula_nit, nombre, telefono, email, direccion
       FROM clientes
       WHERE telefono LIKE $1
         AND activo = TRUE
       ORDER BY nombre
       LIMIT 20`,
      [`%${telefono.trim()}%`]
    );

    return resultado.rows;
  }

  /**
   * Busca un cliente por cédula/NIT exacto.
   */
  static async buscarPorCedula(cedula: string): Promise<Cliente | null> {
    const resultado = await query(
      `SELECT id, cedula_nit, nombre, telefono, email, direccion
       FROM clientes
       WHERE cedula_nit = $1 AND activo = TRUE`,
      [cedula.trim()]
    );

    return resultado.rows[0] || null;
  }

  /**
   * Registra un nuevo cliente.
   */
  static async crear(dto: CrearClienteDTO): Promise<Cliente> {
    if (!dto.nombre || dto.nombre.trim().length === 0) {
      throw new AppError('El nombre del cliente es requerido', 400);
    }

    if (dto.cedula_nit) {
      const existente = await query(
        'SELECT id FROM clientes WHERE cedula_nit = $1',
        [dto.cedula_nit]
      );
      if (existente.rows.length > 0) {
        throw new AppError(`Ya existe un cliente con cédula/NIT: ${dto.cedula_nit}`, 409);
      }
    }

    const resultado = await query(
      `INSERT INTO clientes (cedula_nit, nombre, telefono, email, direccion, notas)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dto.cedula_nit || null,
        dto.nombre.trim(),
        dto.telefono || null,
        dto.email || null,
        dto.direccion || null,
        dto.notas || null,
      ]
    );

    return resultado.rows[0];
  }

  /**
   * Lista todos los clientes activos con paginación.
   */
  static async listar(page: number = 1, limit: number = 50): Promise<{ clientes: Cliente[]; total: number }> {
    const offset = (page - 1) * limit;

    const [datos, conteo] = await Promise.all([
      query(
        `SELECT id, cedula_nit, nombre, telefono, email, direccion, created_at
         FROM clientes
         WHERE activo = TRUE
         ORDER BY nombre
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query('SELECT COUNT(*) AS total FROM clientes WHERE activo = TRUE'),
    ]);

    return {
      clientes: datos.rows,
      total: parseInt(conteo.rows[0].total),
    };
  }
}
