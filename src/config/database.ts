import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     ?? 'localhost',
  port:               Number(process.env.DB_PORT ?? 3306),
  user:               process.env.DB_USER     ?? 'root',
  password:           process.env.DB_PASSWORD ?? '',
  database:           process.env.DB_NAME     ?? 'eletroguin',
  connectionLimit:    Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  waitForConnections: true,
  queueLimit:         0,
  charset:            'utf8mb4',
  timezone:           '+00:00',
});

export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  logger.info('✅  MySQL conectado com sucesso');
}

export default pool;
