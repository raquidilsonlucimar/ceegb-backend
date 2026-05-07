import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { testConnection } from './config/database';
import { logger } from './config/logger';
import { errorHandler } from './middleware/error';
import routes from './routes';

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Garantir pasta de uploads ─────────────────────────────────
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
['projetos', 'relatorios', 'geral'].forEach(sub => {
  const dir = path.join(UPLOAD_DIR, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Pasta criada: ${dir}`);
  }
});

app.use(express.static(path.join(__dirname, '../../frontend')));

// ── Segurança ─────────────────────────────────────────────────
app.use(helmet({
  // Permitir leitura de ficheiros estáticos (PDFs em iframe, etc.)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin:      process.env.CORS_ORIGIN ?? '*',
  credentials: true,
}));

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  message:  { erro: 'Demasiadas requisições. Tente novamente mais tarde.' },
}));

// Rate limiting no login
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { erro: 'Demasiadas tentativas de login.' },
}));

// Rate limiting em uploads (proteção extra)
app.use('/api/upload', rateLimit({
  windowMs: 60 * 1000,   // 1 minuto
  max:      30,
  message:  { erro: 'Demasiados uploads. Aguarde um momento.' },
}));

// ── Middlewares ───────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: msg => logger.http(msg.trim()) },
}));

// ── Servir ficheiros de upload como estáticos ─────────────────
// Acesso: GET http://localhost:3001/uploads/projetos/filename.pdf
app.use('/uploads', express.static(UPLOAD_DIR, {
  // Cabeçalhos para PDFs e documentos
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline'); // abrir no browser
    }
    // Cache de 7 dias para ficheiros estáticos
    res.setHeader('Cache-Control', 'public, max-age=604800');
  },
}));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
    uploads:   UPLOAD_DIR,
  });
});

// ── Rotas API ─────────────────────────────────────────────────
app.use('/api', routes);

// 404
app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

// Error handler global
app.use(errorHandler);

// ── Arranque ──────────────────────────────────────────────────
async function main() {
  await testConnection();
  app.listen(PORT, () => {
    logger.info(`🚀  Servidor:  http://localhost:${PORT}`);
    logger.info(`📁  Uploads:   http://localhost:${PORT}/uploads`);
    logger.info(`📚  API:       http://localhost:${PORT}/api`);
  });
}

main().catch(err => {
  logger.error('Falha ao iniciar:', err);
  process.exit(1);
});

export default app;