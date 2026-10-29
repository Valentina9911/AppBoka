const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

async function migrate() {
  const dir = path.join(__dirname, '..', '..', 'database', 'migrations');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^\d{3}_.+\.sql$/.test(f)).sort() : [];
  if (!files.length) {
    console.log('No hay migraciones: la base inicial no crea tablas de negocio.');
    return;
  }
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'boka_demo', user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '', connectionTimeoutMillis: 5000,
  });
  let client;
  let locked = false;
  try {
    client = await pool.connect();
    await client.query("SELECT pg_advisory_lock(hashtext('boka.migrations.v2'))");
    locked = true;
    await client.query(`CREATE TABLE IF NOT EXISTS public.boka_migrations (
      nombre text PRIMARY KEY, sha256 text NOT NULL, aplicada_en timestamptz NOT NULL DEFAULT now()
    )`);
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const hash = crypto.createHash('sha256').update(sql).digest('hex');
      const old = await client.query('SELECT sha256 FROM public.boka_migrations WHERE nombre=$1', [file]);
      if (old.rows.length) {
        if (old.rows[0].sha256 !== hash) throw new Error(`${file} cambio despues de aplicarse. Crear una migracion nueva.`);
        console.log(`Ya aplicada: ${file}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL search_path = public, pg_catalog');
        await client.query(sql);
        await client.query('INSERT INTO public.boka_migrations(nombre,sha256) VALUES ($1,$2)', [file, hash]);
        await client.query('COMMIT');
        console.log(`Aplicada: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`${file}: ${error.message}`);
      }
    }
  } finally {
    if (client) {
      try { if (locked) await client.query("SELECT pg_advisory_unlock(hashtext('boka.migrations.v2'))"); }
      finally { client.release(); }
    }
    await pool.end();
  }
}
migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
