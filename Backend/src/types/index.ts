
import { Request } from 'express';


export interface UsuarioAuth {
  id: string;
  username: string;
  nombre_completo: string;
}

export interface AuthRequest extends Request {
  usuario?: UsuarioAuth;
}


export interface Usuario {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  nombre_completo: string;
  telefono: string | null;
  pin_rapido: string | null;
  activo: boolean;
  ultimo_acceso: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Cliente {
  id: number;
  cedula_nit: string | null;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Mesa {
  id: number;
  nombre: string;
  capacidad: number;
  ubicacion: string | null;
  estado: 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento';
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MesaEstado extends Mesa {
  cuenta_id: string | null;
  cuenta_numero: number | null;
  cuenta_total: number | null;
  mesero_id: string | null;
  mesero_nombre: string | null;
  cuenta_abierta_desde: Date | null;
  numero_comensales: number | null;
}

export interface Cuenta {
  id: string;
  numero: number;
  mesa_id: number | null;
  cliente_id: number;
  mesero_id: string | null;
  estado: 'abierta' | 'pagada' | 'cancelada';
  subtotal: number;
  impuestos: number;
  descuento: number;
  descuento_pct: number;
  total: number;
  propina: number;
  numero_comensales: number;
  notas: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CuentaItem {
  id: string;
  cuenta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  impuesto_pct: number;
  descuento: number;
  subtotal: number;
  notas: string | null;
  estado: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
  created_at: Date;
  updated_at: Date;
}

export interface Venta {
  id: string;
  numero_factura: number;
  cuenta_id: string;
  cliente_id: number;
  cajero_id: string;
  turno_caja_id: string;
  subtotal: number;
  impuestos: number;
  descuento: number;
  propina: number;
  total: number;
  total_pagado: number;
  cambio: number;
  anulada: boolean;
  motivo_anulacion: string | null;
  notas: string | null;
  created_at: Date;
  updated_at: Date;
}


export interface LoginDTO {
  username: string;
  password: string;
}

export interface CrearClienteDTO {
  cedula_nit?: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
}

export interface AbrirCuentaDTO {
  mesa_id?: number | null;
  cliente_id?: number;
  numero_comensales?: number;
  notas?: string;
}

export interface AgregarItemDTO {
  producto_id: string;
  cantidad: number;
  notas?: string;
}

export interface PagoDTO {
  metodo_pago: 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'nequi' | 'daviplata' | 'transferencia' | 'otro';
  monto: number;
  referencia?: string;
  notas?: string;
}

export interface PagarCuentaDTO {
  cuenta_id: string;
  turno_caja_id: string;
  pagos: PagoDTO[];
  propina?: number;
  notas?: string;
}


export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;
}
