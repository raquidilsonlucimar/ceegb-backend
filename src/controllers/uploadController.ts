import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database';
import { HttpError } from '../middleware/error';

// ── Pasta base de uploads ──────────────────────────────────────
const UPLOAD_BASE = path.resolve(process.env.UPLOAD_DIR ?? './uploads');

// Garante que as sub-pastas existem ao iniciar
['projetos', 'relatorios', 'geral'].forEach(sub => {
  const dir = path.join(UPLOAD_BASE, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Tipos permitidos ──────────────────────────────────────────
const TIPOS_PERMITIDOS: Record<string, string> = {
  'application/pdf':  'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv',
  'image/jpeg': 'jpg',
  'image/png':  'png',
};

const MAX_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB ?? 20);

// ── Storage engine ────────────────────────────────────────────
function criarStorage(subpasta: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOAD_BASE, subpasta));
    },
    filename: (_req, file, cb) => {
      // ex: 1718100000000-relatorio-setor-eletrico.pdf
      const ts   = Date.now();
      const base = path.basename(file.originalname, path.extname(file.originalname))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60);
      const ext  = path.extname(file.originalname).toLowerCase();
      cb(null, `${ts}-${base}${ext}`);
    },
  });
}

function filtroFicheiros(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (TIPOS_PERMITIDOS[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de ficheiro não permitido: ${file.mimetype}. Use PDF, DOC, DOCX, XLS, XLSX, CSV ou imagem.`));
  }
}

// ── Instâncias Multer ─────────────────────────────────────────
export const uploadProjeto   = multer({ storage: criarStorage('projetos'),  fileFilter: filtroFicheiros, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });
export const uploadRelatorio = multer({ storage: criarStorage('relatorios'), fileFilter: filtroFicheiros, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });
export const uploadGeral     = multer({ storage: criarStorage('geral'),      fileFilter: filtroFicheiros, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });

// ── Helpers ───────────────────────────────────────────────────
function urlPublica(subpasta: string, filename: string): string {
  const base = (process.env.PUBLIC_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/uploads/${subpasta}/${filename}`;
}

function tamanhoKb(bytes: number): number {
  return Math.round(bytes / 1024);
}

// ── CONTROLLERS ───────────────────────────────────────────────

/**
 * POST /api/upload/projeto/:id/documento
 * Faz upload de um ficheiro e regista como documento do projeto
 */
export async function uploadDocumentoProjeto(req: Request, res: Response): Promise<void> {
  const projetoId = Number(req.params.id);
  if (!req.file) throw new HttpError(400, 'Nenhum ficheiro recebido');

  // Verificar que o projeto existe
  const [[proj]]: any = await pool.query('SELECT id FROM projetos WHERE id = ?', [projetoId]);
  if (!proj) {
    // Remover ficheiro órfão
    fs.unlinkSync(req.file.path);
    throw new HttpError(404, 'Projeto não encontrado');
  }

  const url  = urlPublica('projetos', req.file.filename);
  const tipo = TIPOS_PERMITIDOS[req.file.mimetype] ?? 'outro';
  const nome = req.body.nome || req.file.originalname;

  const [result]: any = await pool.query(
    'INSERT INTO projeto_documentos (projeto_id, nome, tipo, url, tamanho_kb) VALUES (?,?,?,?,?)',
    [projetoId, nome, tipo, url, tamanhoKb(req.file.size)],
  );

  res.status(201).json({
    id:         result.insertId,
    nome,
    tipo,
    url,
    tamanho_kb: tamanhoKb(req.file.size),
    ficheiro:   req.file.filename,
  });
}

/**
 * POST /api/upload/relatorio/:id/documento
 * Faz upload do PDF principal de um relatório e actualiza o campo url_documento
 */
export async function uploadDocumentoRelatorio(req: Request, res: Response): Promise<void> {
  const relId = Number(req.params.id);
  if (!req.file) throw new HttpError(400, 'Nenhum ficheiro recebido');

  const [[rel]]: any = await pool.query('SELECT id FROM relatorios WHERE id = ?', [relId]);
  if (!rel) {
    fs.unlinkSync(req.file.path);
    throw new HttpError(404, 'Relatório não encontrado');
  }

  const url = urlPublica('relatorios', req.file.filename);
  await pool.query('UPDATE relatorios SET url_documento = ? WHERE id = ?', [url, relId]);

  res.json({
    url,
    tamanho_kb: tamanhoKb(req.file.size),
    ficheiro:   req.file.filename,
  });
}

/**
 * POST /api/upload/geral
 * Upload genérico — devolve a URL pública sem associar a nenhum registo
 */
export async function uploadGeral_(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new HttpError(400, 'Nenhum ficheiro recebido');
  res.json({
    url:        urlPublica('geral', req.file.filename),
    nome:       req.file.originalname,
    tamanho_kb: tamanhoKb(req.file.size),
    tipo:       TIPOS_PERMITIDOS[req.file.mimetype] ?? 'outro',
  });
}

/**
 * DELETE /api/upload/documento/:docId
 * Remove o documento do disco e da BD
 */
export async function removerDocumento(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.docId);
  const [[doc]]: any = await pool.query(
    'SELECT url FROM projeto_documentos WHERE id = ?', [id],
  );
  if (!doc) throw new HttpError(404, 'Documento não encontrado');

  // Apagar ficheiro físico
  try {
    const filename = path.basename(doc.url);
    // Detectar subpasta pela URL
    const sub = doc.url.includes('/projetos/') ? 'projetos'
      : doc.url.includes('/relatorios/') ? 'relatorios' : 'geral';
    const filePath = path.join(UPLOAD_BASE, sub, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ficheiro já não existe — continuar
  }

  await pool.query('DELETE FROM projeto_documentos WHERE id = ?', [id]);
  res.json({ mensagem: 'Documento removido' });
}

/**
 * GET /api/upload/info
 * Informação sobre configuração de uploads (tamanho máx, tipos, etc.)
 */
export async function infoUpload(_req: Request, res: Response): Promise<void> {
  res.json({
    max_size_mb:      MAX_SIZE_MB,
    tipos_permitidos: Object.values(TIPOS_PERMITIDOS).filter((v, i, a) => a.indexOf(v) === i),
    extensoes:        Object.keys(TIPOS_PERMITIDOS).map(m => '.' + (TIPOS_PERMITIDOS[m])),
  });
}

// ── Middleware para erros do Multer ───────────────────────────
export function multerErrorHandler(
  err: Error & { code?: string },
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ erro: `Ficheiro demasiado grande. Máximo: ${MAX_SIZE_MB}MB` });
    return;
  }
  if (err.message?.includes('Tipo de ficheiro')) {
    res.status(415).json({ erro: err.message });
    return;
  }
  next(err);
}