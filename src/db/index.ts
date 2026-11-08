/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Cache global de conexión para preservar el pool en hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Función para crear u obtener el pool de conexiones de PostgreSQL
export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Error inesperado en cliente idle del pool de PostgreSQL:', err);
    });
  }
  return global._postgresPool;
};

// Instancia del pool y de Drizzle ORM
const pool = createPool();

export const db = drizzle(pool, { schema });
