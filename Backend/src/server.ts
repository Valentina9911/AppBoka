
import app from './app';
import { testConnection } from './config/database';
import dotenv from 'dotenv';
import { CuentasService } from './modules/cuentas/cuentas.service';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap() {
  try {
    console.log('🔄 Iniciando Backend POS Restaurantes...');

    await testConnection();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`✅ Entorno: ${process.env.NODE_ENV || 'development'}`);
    });

    CuentasService.limpiarCuentasFantasma(); 
    setInterval(() => {
      CuentasService.limpiarCuentasFantasma();
    }, 60 * 60 * 1000); 

    process.on('SIGTERM', () => shutdown(server));
    process.on('SIGINT', () => shutdown(server));

  } catch (error) {
    console.error('❌ Error crítico al iniciar el servidor:', error);
    process.exit(1);
  }
}

function shutdown(server: any) {
  console.log('\n🛑 Señal de apagado recibida. Cerrando conexiones...');
  
  server.close(async () => {
    console.log('HTTP server cerrado.');
    
    try {
      const pool = (await import('./config/database')).default;
      await pool.end();
      console.log('Pool de base de datos cerrado.');
      process.exit(0);
    } catch (err) {
      console.error('Error cerrando el pool de DB:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Apagado forzado después de 10s timeout');
    process.exit(1);
  }, 10000);
}

bootstrap();