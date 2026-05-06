import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
import { config } from "./config";

if (!config.database.url) {
  throw new Error(
    "DATABASE_URL must be set when using database storage. Did you forget to provision a database?",
  );
}

const { Pool } = pg;
export const pool = new Pool({ 
  connectionString: config.database.url,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool, { schema });
