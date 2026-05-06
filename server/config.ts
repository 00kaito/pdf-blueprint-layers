import fs from 'fs';
import path from 'path';

/**
 * Manually load .env file if it exists.
 * This is useful for local development without needing external tools.
 */
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      const firstEqual = trimmedLine.indexOf('=');
      if (firstEqual === -1) return;
      const key = trimmedLine.substring(0, firstEqual).trim();
      let value = trimmedLine.substring(firstEqual + 1).trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
  }
}

// Load env vars at the start
loadEnv();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

/**
 * Centralized configuration for the application.
 * All environment-dependent variables should be defined here.
 */
export const config = {
  env: NODE_ENV,
  isProd,
  port: parseInt(process.env.PORT || '5000', 10),
  
  /**
   * Storage type determines which IStorage implementation to use.
   * Defaults to 'database' if DATABASE_URL is present, otherwise 'file'.
   */
  storageType: process.env.STORAGE_TYPE || (process.env.DATABASE_URL ? 'database' : 'file'),
  
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true',
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  }
};
