import { Router } from 'express';
import { asyncHandler } from '../middleware/error';
import { autenticar, autorizar } from '../middleware/auth';

import * as auth    from '../controllers/authController';
import * as proj    from '../controllers/projetosController';
import * as content from '../controllers/contentController';
import {
  uploadProjeto,
  uploadRelatorio,
  uploadGeral,
  uploadDocumentoProjeto,
  uploadDocumentoRelatorio,
  uploadGeral_,
  removerDocumento,
  infoUpload,
  multerErrorHandler,
} from '../controllers/uploadController';

const router = Router();

// ── AUTH ──────────────────────────────────────────────────────
router.post('/auth/login',            asyncHandler(auth.login));
router.get ('/auth/me',               autenticar, asyncHandler(auth.me));
router.put ('/auth/alterar-password', autenticar, asyncHandler(auth.alterarPassword));
router.put ('/auth/definir-password', autenticar, asyncHandler(auth.definirPassword));

// ── UTILIZADORES (admin only) ─────────────────────────────────
router.get   ('/utilizadores',                    autenticar, autorizar('admin'), asyncHandler(auth.listar));
router.post  ('/utilizadores',                    autenticar, autorizar('admin'), asyncHandler(auth.criar));
router.put   ('/utilizadores/:id',                autenticar, autorizar('admin'), asyncHandler(auth.atualizar));
router.post  ('/utilizadores/:id/reset-password', autenticar, autorizar('admin'), asyncHandler(auth.resetPassword));
router.delete('/utilizadores/:id',                autenticar, autorizar('admin'), asyncHandler(auth.remover));

// ── DASHBOARD ─────────────────────────────────────────────────
router.get('/dashboard', autenticar, asyncHandler(content.dashboard));

// ── PROJETOS ─────────────────────────────────────────────────
router.get   ('/projetos',       asyncHandler(proj.listar));
router.get   ('/projetos/:slug', asyncHandler(proj.obter));
router.post  ('/projetos',       autenticar, autorizar('admin','editor'), asyncHandler(proj.criar));
router.put   ('/projetos/:id',   autenticar, autorizar('admin','editor'), asyncHandler(proj.atualizar));
router.delete('/projetos/:id',   autenticar, autorizar('admin'),          asyncHandler(proj.remover));

// Documentos (JSON — URL manual)
router.post  ('/projetos/:id/documentos',         autenticar, autorizar('admin','editor'), asyncHandler(proj.adicionarDocumento));
router.delete('/projetos/:id/documentos/:docId',  autenticar, autorizar('admin','editor'), asyncHandler(proj.removerDocumento));

// ── RELATÓRIOS ───────────────────────────────────────────────
router.get   ('/relatorios',               asyncHandler(content.listarRelatorios));
router.get   ('/relatorios/:id',           asyncHandler(content.obterRelatorio));
router.post  ('/relatorios',               autenticar, autorizar('admin','editor'), asyncHandler(content.criarRelatorio));
router.put   ('/relatorios/:id',           autenticar, autorizar('admin','editor'), asyncHandler(content.atualizarRelatorio));
router.delete('/relatorios/:id',           autenticar, autorizar('admin'),          asyncHandler(content.removerRelatorio));
router.post  ('/relatorios/:id/download',  asyncHandler(content.incrementarDownload));

// ── NOTÍCIAS ─────────────────────────────────────────────────
router.get   ('/noticias',       asyncHandler(content.listarNoticias));
router.get   ('/noticias/:slug', asyncHandler(content.obterNoticia));
router.post  ('/noticias',       autenticar, autorizar('admin','editor'), asyncHandler(content.criarNoticia));
router.put   ('/noticias/:id',   autenticar, autorizar('admin','editor'), asyncHandler(content.atualizarNoticia));
router.delete('/noticias/:id',   autenticar, autorizar('admin'),          asyncHandler(content.removerNoticia));

// ── EQUIPA ───────────────────────────────────────────────────
router.get   ('/equipa',       asyncHandler(content.listarEquipa));
router.post  ('/equipa',       autenticar, autorizar('admin'),          asyncHandler(content.criarMembro));
router.put   ('/equipa/:id',   autenticar, autorizar('admin','editor'), asyncHandler(content.atualizarMembro));
router.delete('/equipa/:id',   autenticar, autorizar('admin'),          asyncHandler(content.removerMembro));

// ── MENSAGENS ────────────────────────────────────────────────
router.get   ('/mensagens',          autenticar, autorizar('admin','editor'), asyncHandler(content.listarMensagens));
router.post  ('/mensagens',          asyncHandler(content.criarMensagem));
router.put   ('/mensagens/:id/lida', autenticar, autorizar('admin','editor'), asyncHandler(content.marcarLida));
router.delete('/mensagens/:id',      autenticar, autorizar('admin'),          asyncHandler(content.removerMensagem));

// ── MERCADO ──────────────────────────────────────────────────
router.get('/indicadores',       asyncHandler(content.listarIndicadores));
router.put('/indicadores/:id',   autenticar, autorizar('admin','editor'), asyncHandler(content.atualizarIndicador));

// ── CATEGORIAS ───────────────────────────────────────────────
router.get('/categorias', asyncHandler(content.listarCategorias));

// ══════════════════════════════════════════════════════════════
//  UPLOADS DE FICHEIROS
// ══════════════════════════════════════════════════════════════

// Info sobre config de uploads (tamanho máx, tipos permitidos)
router.get('/upload/info', asyncHandler(infoUpload));

// Upload de documento para projeto (multipart/form-data, campo "ficheiro")
router.post(
  '/upload/projeto/:id/documento',
  autenticar, autorizar('admin','editor'),
  uploadProjeto.single('ficheiro'),
  multerErrorHandler,
  asyncHandler(uploadDocumentoProjeto),
);

// Upload do PDF principal de um relatório
router.post(
  '/upload/relatorio/:id/documento',
  autenticar, autorizar('admin','editor'),
  uploadRelatorio.single('ficheiro'),
  multerErrorHandler,
  asyncHandler(uploadDocumentoRelatorio),
);

// Upload genérico (devolve URL sem associar a nenhum registo)
router.post(
  '/upload/geral',
  autenticar, autorizar('admin','editor'),
  uploadGeral.single('ficheiro'),
  multerErrorHandler,
  asyncHandler(uploadGeral_),
);

// Remover documento (apaga ficheiro físico + registo BD)
router.delete(
  '/upload/documento/:docId',
  autenticar, autorizar('admin','editor'),
  asyncHandler(removerDocumento),
);

export default router;