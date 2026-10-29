
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pos_restaurantes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,                    // Máximo de conexiones simultáneas
  idleTimeoutMillis: 30000,   // Cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 5000, // Timeout de conexión de 5s
});

pool.on('error', (err: Error) => {
  console.error('[DB] Error inesperado en cliente idle del pool:', err.message);
});

pool.on('connect', () => {
  console.log('[DB] Nueva conexión establecida con PostgreSQL');
});

/**
 * Ejecuta un query simple contra el pool.
 * Para queries individuales que no necesitan transacción.
 */
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

/**
 * Obtiene un cliente del pool para usar en transacciones.
 * IMPORTANTE: Siempre llamar client.release() cuando se termine.
 */
export const getClient = (): Promise<PoolClient> => {
  return pool.connect();
};

/**
 * Verifica la conexión a la base de datos.
 */
export const testConnection = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() AS current_time');
    console.log(`[DB] Conexión exitosa a PostgreSQL. Hora del servidor: ${result.rows[0].current_time}`);
  } finally {
    client.release();
  }
};

export default pool;
