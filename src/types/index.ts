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

// ── Paginação ────────────────────────────────────────────────
export interface PaginationQuery {
  page?:  number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ── JWT Payload ──────────────────────────────────────────────
export interface JwtPayload {
  id:             number;
  email:          string;
  role:           'admin' | 'editor' | 'viewer';
  primeiro_login?: boolean;
  iat?:           number;
  exp?:           number;
}

// ── Utilizador ───────────────────────────────────────────────
export interface Utilizador {
  id:             number;
  nome:           string;
  email:          string;
  role:           'admin' | 'editor' | 'viewer';
  ativo:          boolean;
  primeiro_login: boolean;
  ultimo_login:   string | null;
  criado_em:      string;
}

// ── Projeto ──────────────────────────────────────────────────
export type EstadoProjeto = 'planeamento' | 'ativo' | 'suspenso' | 'concluido';

export interface Projeto {
  id:                number;
  titulo:            string;
  slug:              string;
  descricao:         string;
  descricao_longa:   string | null;
  categoria_id:      number;
  categoria_nome?:   string;
  estado:            EstadoProjeto;
  progresso:         number;
  responsavel:       string | null;
  data_inicio:       string | null;
  data_fim_prevista: string | null;
  data_conclusao:    string | null;
  orcamento:         number | null;
  financiador:       string | null;
  publicado:         boolean;
  documentos?:       ProjetoDocumento[];
  criado_em:         string;
  atualizado_em:     string;
}

export interface ProjetoDocumento {
  id:         number;
  projeto_id: number;
  nome:       string;
  tipo:       'pdf' | 'xlsx' | 'docx' | 'csv' | 'outro';
  url:        string;
  tamanho_kb: number | null;
  criado_em:  string;
}

export interface CreateProjetoDto {
  titulo:             string;
  descricao:          string;
  descricao_longa?:   string;
  categoria_id:       number;
  estado?:            EstadoProjeto;
  progresso?:         number;
  responsavel?:       string;
  data_inicio?:       string;
  data_fim_prevista?: string;
  orcamento?:         number;
  financiador?:       string;
  publicado?:         boolean;
}

// ── Relatório ─────────────────────────────────────────────────
export interface Relatorio {
  id:              number;
  titulo:          string;
  slug:            string;
  resumo:          string | null;
  conteudo:        string | null;
  categoria_id:    number;
  categoria_nome?: string;
  url_documento:   string | null;
  data_publicacao: string;
  publicado:       boolean;
  destaque:        boolean;
  downloads:       number;
  criado_em:       string;
  atualizado_em:   string;
}

export interface CreateRelatorioDto {
  titulo:          string;
  resumo?:         string;
  conteudo?:       string;
  categoria_id:    number;
  url_documento?:  string;
  data_publicacao: string;
  publicado?:      boolean;
  destaque?:       boolean;
}

// ── Notícia ──────────────────────────────────────────────────
export interface Noticia {
  id:              number;
  titulo:          string;
  slug:            string;
  resumo:          string | null;
  conteudo:        string;
  imagem_url:      string | null;
  destaque:        boolean;
  publicado:       boolean;
  data_publicacao: string;
  visualizacoes:   number;
  criado_em:       string;
  atualizado_em:   string;
}

export interface CreateNoticiaDto {
  titulo:          string;
  resumo?:         string;
  conteudo:        string;
  imagem_url?:     string;
  destaque?:       boolean;
  data_publicacao: string;
  publicado?:      boolean;
}

// ── Equipa ───────────────────────────────────────────────────
export interface MembroEquipa {
  id:            number;
  nome:          string;
  cargo:         string;
  bio:           string | null;
  email:         string | null;
  telefone:      string | null;
  linkedin:      string | null;
  foto_url:      string | null;
  cor_avatar:    string;
  ordem:         number;
  ativo:         boolean;
  criado_em:     string;
  atualizado_em: string;
}

export interface CreateMembroDto {
  nome:        string;
  cargo:       string;
  bio?:        string;
  email?:      string;
  telefone?:   string;
  linkedin?:   string;
  cor_avatar?: string;
  ordem?:      number;
}

// ── Mensagem ─────────────────────────────────────────────────
export interface Mensagem {
  id:          number;
  nome:        string;
  email:       string;
  telefone:    string | null;
  organizacao: string | null;
  assunto:     string;
  mensagem:    string;
  lida:        boolean;
  respondida:  boolean;
  criado_em:   string;
}

export interface CreateMensagemDto {
  nome:         string;
  email:        string;
  telefone?:    string;
  organizacao?: string;
  assunto:      string;
  mensagem:     string;
}

// ── Indicador Mercado ─────────────────────────────────────────
export interface IndicadorMercado {
  id:            number;
  nome:          string;
  valor:         string;
  unidade:       string | null;
  descricao:     string | null;
  icone:         string | null;
  ordem:         number;
  ativo:         boolean;
  atualizado_em: string;
}

export default app;


// ── Express Request augmentation ─────────────────────────────
// Permite usar req.user em todos os controllers sem erro TS
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// declare namespace Express {
//   export interface Request {
//     user?: {
//       id: number;
//       email: string;
//       role: string;
//       primeiro_login?: boolean;
//     };
//   }
// }