"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadGeral = exports.uploadRelatorio = exports.uploadProjeto = void 0;
exports.uploadDocumentoProjeto = uploadDocumentoProjeto;
exports.uploadDocumentoRelatorio = uploadDocumentoRelatorio;
exports.uploadGeral_ = uploadGeral_;
exports.removerDocumento = removerDocumento;
exports.infoUpload = infoUpload;
exports.multerErrorHandler = multerErrorHandler;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = __importDefault(require("../config/database"));
const error_1 = require("../middleware/error");
// ── Pasta base de uploads ──────────────────────────────────────
const UPLOAD_BASE = path_1.default.resolve(process.env.UPLOAD_DIR ?? './uploads');
// Garante que as sub-pastas existem ao iniciar
['projetos', 'relatorios', 'geral'].forEach(sub => {
    const dir = path_1.default.join(UPLOAD_BASE, sub);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
});
// ── Tipos permitidos ──────────────────────────────────────────
const TIPOS_PERMITIDOS = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/csv': 'csv',
    'image/jpeg': 'jpg',
    'image/png': 'png',
};
const MAX_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB ?? 20);
// ── Storage engine ────────────────────────────────────────────
function criarStorage(subpasta) {
    return multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, path_1.default.join(UPLOAD_BASE, subpasta));
        },
        filename: (_req, file, cb) => {
            // ex: 1718100000000-relatorio-setor-eletrico.pdf
            const ts = Date.now();
            const base = path_1.default.basename(file.originalname, path_1.default.extname(file.originalname))
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .slice(0, 60);
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            cb(null, `${ts}-${base}${ext}`);
        },
    });
}
function filtroFicheiros(_req, file, cb) {
    if (TIPOS_PERMITIDOS[file.mimetype]) {
        cb(null, true);
    }
    else {
        cb(new Error(`Tipo de ficheiro não permitido: ${file.mimetype}. Use PDF, DOC, DOCX, XLS, XLSX, CSV ou imagem.`));
    }
}
// ── Instâncias Multer ─────────────────────────────────────────
exports.uploadProjeto = (0, multer_1.default)({ storage: criarStorage('projetos'), fileFilter: filtroFicheiros, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });
exports.uploadRelatorio = (0, multer_1.default)({ storage: criarStorage('relatorios'), fileFilter: filtroFicheiros, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });
exports.uploadGeral = (0, multer_1.default)({ storage: criarStorage('geral'), fileFilter: filtroFicheiros, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });
// ── Helpers ───────────────────────────────────────────────────
function urlPublica(subpasta, filename) {
    const base = (process.env.PUBLIC_URL ?? 'http://localhost:3001').replace(/\/$/, '');
    return `${base}/uploads/${subpasta}/${filename}`;
}
function tamanhoKb(bytes) {
    return Math.round(bytes / 1024);
}
// ── CONTROLLERS ───────────────────────────────────────────────
/**
 * POST /api/upload/projeto/:id/documento
 * Faz upload de um ficheiro e regista como documento do projeto
 */
async function uploadDocumentoProjeto(req, res) {
    const projetoId = Number(req.params.id);
    if (!req.file)
        throw new error_1.HttpError(400, 'Nenhum ficheiro recebido');
    // Verificar que o projeto existe
    const [[proj]] = await database_1.default.query('SELECT id FROM projetos WHERE id = ?', [projetoId]);
    if (!proj) {
        // Remover ficheiro órfão
        fs_1.default.unlinkSync(req.file.path);
        throw new error_1.HttpError(404, 'Projeto não encontrado');
    }
    const url = urlPublica('projetos', req.file.filename);
    const tipo = TIPOS_PERMITIDOS[req.file.mimetype] ?? 'outro';
    const nome = req.body.nome || req.file.originalname;
    const [result] = await database_1.default.query('INSERT INTO projeto_documentos (projeto_id, nome, tipo, url, tamanho_kb) VALUES (?,?,?,?,?)', [projetoId, nome, tipo, url, tamanhoKb(req.file.size)]);
    res.status(201).json({
        id: result.insertId,
        nome,
        tipo,
        url,
        tamanho_kb: tamanhoKb(req.file.size),
        ficheiro: req.file.filename,
    });
}
/**
 * POST /api/upload/relatorio/:id/documento
 * Faz upload do PDF principal de um relatório e actualiza o campo url_documento
 */
async function uploadDocumentoRelatorio(req, res) {
    const relId = Number(req.params.id);
    if (!req.file)
        throw new error_1.HttpError(400, 'Nenhum ficheiro recebido');
    const [[rel]] = await database_1.default.query('SELECT id FROM relatorios WHERE id = ?', [relId]);
    if (!rel) {
        fs_1.default.unlinkSync(req.file.path);
        throw new error_1.HttpError(404, 'Relatório não encontrado');
    }
    const url = urlPublica('relatorios', req.file.filename);
    await database_1.default.query('UPDATE relatorios SET url_documento = ? WHERE id = ?', [url, relId]);
    res.json({
        url,
        tamanho_kb: tamanhoKb(req.file.size),
        ficheiro: req.file.filename,
    });
}
/**
 * POST /api/upload/geral
 * Upload genérico — devolve a URL pública sem associar a nenhum registo
 */
async function uploadGeral_(req, res) {
    if (!req.file)
        throw new error_1.HttpError(400, 'Nenhum ficheiro recebido');
    res.json({
        url: urlPublica('geral', req.file.filename),
        nome: req.file.originalname,
        tamanho_kb: tamanhoKb(req.file.size),
        tipo: TIPOS_PERMITIDOS[req.file.mimetype] ?? 'outro',
    });
}
/**
 * DELETE /api/upload/documento/:docId
 * Remove o documento do disco e da BD
 */
async function removerDocumento(req, res) {
    const id = Number(req.params.docId);
    const [[doc]] = await database_1.default.query('SELECT url FROM projeto_documentos WHERE id = ?', [id]);
    if (!doc)
        throw new error_1.HttpError(404, 'Documento não encontrado');
    // Apagar ficheiro físico
    try {
        const filename = path_1.default.basename(doc.url);
        // Detectar subpasta pela URL
        const sub = doc.url.includes('/projetos/') ? 'projetos'
            : doc.url.includes('/relatorios/') ? 'relatorios' : 'geral';
        const filePath = path_1.default.join(UPLOAD_BASE, sub, filename);
        if (fs_1.default.existsSync(filePath))
            fs_1.default.unlinkSync(filePath);
    }
    catch {
        // ficheiro já não existe — continuar
    }
    await database_1.default.query('DELETE FROM projeto_documentos WHERE id = ?', [id]);
    res.json({ mensagem: 'Documento removido' });
}
/**
 * GET /api/upload/info
 * Informação sobre configuração de uploads (tamanho máx, tipos, etc.)
 */
async function infoUpload(_req, res) {
    res.json({
        max_size_mb: MAX_SIZE_MB,
        tipos_permitidos: Object.values(TIPOS_PERMITIDOS).filter((v, i, a) => a.indexOf(v) === i),
        extensoes: Object.keys(TIPOS_PERMITIDOS).map(m => '.' + (TIPOS_PERMITIDOS[m])),
    });
}
// ── Middleware para erros do Multer ───────────────────────────
function multerErrorHandler(err, _req, res, next) {
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
//# sourceMappingURL=uploadController.js.map