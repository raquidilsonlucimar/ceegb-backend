import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { testConnection } from '../config/database';
import { logger } from '../config/logger';
import { errorHandler } from '../middleware/error';
import routes from '..';

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── SEGURANÇA ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGIN ?? '*',
  credentials: true,
}));

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max:      200,
  message:  { erro: 'Demasiadas requisições. Tente novamente mais tarde.' },
}));

// Rate limiting mais restritivo para login
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { erro: 'Demasiadas tentativas de login.' },
}));

// ── MIDDLEWARES ───────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Servir ficheiros de upload
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── ROTAS API ────────────────────────────────────────────────
app.use('/api', routes);

// 404 para rotas não encontradas
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// ── TRATAMENTO DE ERROS ──────────────────────────────────────
app.use(errorHandler);

// ── ARRANQUE ─────────────────────────────────────────────────
async function main() {
  await testConnection();
  app.listen(PORT, () => {
    logger.info(`🚀  Servidor a correr em http://localhost:${PORT}`);
    logger.info(`📚  API disponível em  http://localhost:${PORT}/api`);
  });
}

main().catch((err) => {
  logger.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});

export default app;