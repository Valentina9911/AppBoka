
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  /**
   * @param message - Mensaje descriptivo del error
   * @param statusCode - Código HTTP (400, 401, 403, 404, 409, 500, etc.)
   * @param isOperational - true = error esperado (validación, no encontrado)
   *                        false = error inesperado (bug, fallo de DB)
   */
  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);

    Object.setPrototypeOf(this, AppError.prototype);
  }
}
