
import { Request, Response } from 'express';
import { ClientesService } from './clientes.service';
import { ApiResponse, CrearClienteDTO } from '../../types';
import { AppError } from '../../utils/AppError';

export class ClientesController {
  /**
   * GET /api/clientes/buscar?telefono=312...
   * Búsqueda rápida de clientes por teléfono.
   */
  static async buscarPorTelefono(req: Request, res: Response): Promise<void> {
    const { telefono } = req.query;

    if (!telefono || typeof telefono !== 'string') {
      throw new AppError('El parámetro "telefono" es requerido', 400);
    }

    const clientes = await ClientesService.buscarPorTelefono(telefono);

    const response: ApiResponse = {
      success: true,
      message: clientes.length > 0 ? `${clientes.length} cliente(s) encontrado(s)` : 'No se encontraron clientes',
      data: clientes,
      statusCode: 200,
    };

    res.status(200).json(response);
  }

  /**
   * POST /api/clientes
   * Registra un nuevo cliente.
   */
  static async crear(req: Request, res: Response): Promise<void> {
    const dto: CrearClienteDTO = req.body;

    if (!dto.nombre) {
      throw new AppError('El campo "nombre" es requerido', 400);
    }

    const cliente = await ClientesService.crear(dto);

    const response: ApiResponse = {
      success: true,
      message: 'Cliente registrado exitosamente',
      data: cliente,
      statusCode: 201,
    };

    res.status(201).json(response);
  }

  /**
   * GET /api/clientes?page=1&limit=50
   * Lista clientes con paginación.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const resultado = await ClientesService.listar(page, limit);

    const response: ApiResponse = {
      success: true,
      message: 'Clientes obtenidos exitosamente',
      data: {
        clientes: resultado.clientes,
        paginacion: {
          pagina_actual: page,
          por_pagina: limit,
          total: resultado.total,
          total_paginas: Math.ceil(resultado.total / limit),
        },
      },
      statusCode: 200,
    };

    res.status(200).json(response);
  }
}
