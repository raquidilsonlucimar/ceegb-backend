"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("./config/database");
const logger_1 = require("./config/logger");
const error_1 = require("./middleware/error");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 3001);
// ── Garantir pasta de uploads ─────────────────────────────────
const UPLOAD_DIR = path_1.default.resolve(process.env.UPLOAD_DIR ?? './uploads');
['projetos', 'relatorios', 'geral'].forEach(sub => {
    const dir = path_1.default.join(UPLOAD_DIR, sub);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
        logger_1.logger.info(`Pasta criada: ${dir}`);
    }
});
app.use(express_1.default.static(path_1.default.join(__dirname, '../../frontend')));
// ── Segurança ─────────────────────────────────────────────────
app.use((0, helmet_1.default)({
    // Permitir leitura de ficheiros estáticos (PDFs em iframe, etc.)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
}));
// Rate limiting global
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { erro: 'Demasiadas requisições. Tente novamente mais tarde.' },
}));
// Rate limiting no login
app.use('/api/auth/login', (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { erro: 'Demasiadas tentativas de login.' },
}));
// Rate limiting em uploads (proteção extra)
app.use('/api/upload', (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minuto
    max: 30,
    message: { erro: 'Demasiados uploads. Aguarde um momento.' },
}));
// ── Middlewares ───────────────────────────────────────────────
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined', {
    stream: { write: msg => logger_1.logger.http(msg.trim()) },
}));
// ── Servir ficheiros de upload como estáticos ─────────────────
// Acesso: GET http://localhost:3001/uploads/projetos/filename.pdf
app.use('/uploads', express_1.default.static(UPLOAD_DIR, {
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
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        uploads: UPLOAD_DIR,
    });
});
// ── Rotas API ─────────────────────────────────────────────────
app.use('/api', routes_1.default);
// 404
app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
// Error handler global
app.use(error_1.errorHandler);
// ── Arranque ──────────────────────────────────────────────────
async function main() {
    await (0, database_1.testConnection)();
    app.listen(PORT, () => {
        logger_1.logger.info(`🚀  Servidor:  http://localhost:${PORT}`);
        logger_1.logger.info(`📁  Uploads:   http://localhost:${PORT}/uploads`);
        logger_1.logger.info(`📚  API:       http://localhost:${PORT}/api`);
    });
}
main().catch(err => {
    logger_1.logger.error('Falha ao iniciar:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map