"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const error_1 = require("../middleware/error");
const auth_1 = require("../middleware/auth");
const auth = __importStar(require("../controllers/authController"));
const proj = __importStar(require("../controllers/projetosController"));
const content = __importStar(require("../controllers/contentController"));
const uploadController_1 = require("../controllers/uploadController");
const router = (0, express_1.Router)();
// ── AUTH ──────────────────────────────────────────────────────
router.post('/auth/login', (0, error_1.asyncHandler)(auth.login));
router.get('/auth/me', auth_1.autenticar, (0, error_1.asyncHandler)(auth.me));
router.put('/auth/alterar-password', auth_1.autenticar, (0, error_1.asyncHandler)(auth.alterarPassword));
router.put('/auth/definir-password', auth_1.autenticar, (0, error_1.asyncHandler)(auth.definirPassword));
// ── UTILIZADORES (admin only) ─────────────────────────────────
router.get('/utilizadores', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(auth.listar));
router.post('/utilizadores', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(auth.criar));
router.put('/utilizadores/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(auth.atualizar));
router.post('/utilizadores/:id/reset-password', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(auth.resetPassword));
router.delete('/utilizadores/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(auth.remover));
// ── DASHBOARD ─────────────────────────────────────────────────
router.get('/dashboard', auth_1.autenticar, (0, error_1.asyncHandler)(content.dashboard));
// ── PROJETOS ─────────────────────────────────────────────────
router.get('/projetos', (0, error_1.asyncHandler)(proj.listar));
router.get('/projetos/:slug', (0, error_1.asyncHandler)(proj.obter));
router.post('/projetos', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(proj.criar));
router.put('/projetos/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(proj.atualizar));
router.delete('/projetos/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(proj.remover));
// Documentos (JSON — URL manual)
router.post('/projetos/:id/documentos', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(proj.adicionarDocumento));
router.delete('/projetos/:id/documentos/:docId', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(proj.removerDocumento));
// ── RELATÓRIOS ───────────────────────────────────────────────
router.get('/relatorios', (0, error_1.asyncHandler)(content.listarRelatorios));
router.get('/relatorios/:id', (0, error_1.asyncHandler)(content.obterRelatorio));
router.post('/relatorios', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(content.criarRelatorio));
router.put('/relatorios/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(content.atualizarRelatorio));
router.delete('/relatorios/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(content.removerRelatorio));
router.post('/relatorios/:id/download', (0, error_1.asyncHandler)(content.incrementarDownload));
// ── NOTÍCIAS ─────────────────────────────────────────────────
router.get('/noticias', (0, error_1.asyncHandler)(content.listarNoticias));
router.get('/noticias/:slug', (0, error_1.asyncHandler)(content.obterNoticia));
router.post('/noticias', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(content.criarNoticia));
router.put('/noticias/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(content.atualizarNoticia));
router.delete('/noticias/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(content.removerNoticia));
// ── EQUIPA ───────────────────────────────────────────────────
router.get('/equipa', (0, error_1.asyncHandler)(content.listarEquipa));
router.post('/equipa', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(content.criarMembro));
router.put('/equipa/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(content.atualizarMembro));
router.delete('/equipa/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(content.removerMembro));
// ── MENSAGENS ────────────────────────────────────────────────
router.get('/mensagens', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(content.listarMensagens));
router.post('/mensagens', (0, error_1.asyncHandler)(content.criarMensagem));
router.put('/mensagens/:id/lida', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(content.marcarLida));
router.delete('/mensagens/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin'), (0, error_1.asyncHandler)(content.removerMensagem));
// ── MERCADO ──────────────────────────────────────────────────
router.get('/indicadores', (0, error_1.asyncHandler)(content.listarIndicadores));
router.put('/indicadores/:id', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(content.atualizarIndicador));
// ── CATEGORIAS ───────────────────────────────────────────────
router.get('/categorias', (0, error_1.asyncHandler)(content.listarCategorias));
// ══════════════════════════════════════════════════════════════
//  UPLOADS DE FICHEIROS
// ══════════════════════════════════════════════════════════════
// Info sobre config de uploads (tamanho máx, tipos permitidos)
router.get('/upload/info', (0, error_1.asyncHandler)(uploadController_1.infoUpload));
// Upload de documento para projeto (multipart/form-data, campo "ficheiro")
router.post('/upload/projeto/:id/documento', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), uploadController_1.uploadProjeto.single('ficheiro'), uploadController_1.multerErrorHandler, (0, error_1.asyncHandler)(uploadController_1.uploadDocumentoProjeto));
// Upload do PDF principal de um relatório
router.post('/upload/relatorio/:id/documento', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), uploadController_1.uploadRelatorio.single('ficheiro'), uploadController_1.multerErrorHandler, (0, error_1.asyncHandler)(uploadController_1.uploadDocumentoRelatorio));
// Upload genérico (devolve URL sem associar a nenhum registo)
router.post('/upload/geral', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), uploadController_1.uploadGeral.single('ficheiro'), uploadController_1.multerErrorHandler, (0, error_1.asyncHandler)(uploadController_1.uploadGeral_));
// Remover documento (apaga ficheiro físico + registo BD)
router.delete('/upload/documento/:docId', auth_1.autenticar, (0, auth_1.autorizar)('admin', 'editor'), (0, error_1.asyncHandler)(uploadController_1.removerDocumento));
exports.default = router;
//# sourceMappingURL=index.js.map