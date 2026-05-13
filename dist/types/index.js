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
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const error_1 = require("../middleware/error");
const __1 = __importDefault(require(".."));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 3001);
// ── SEGURANÇA ────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
}));
// Rate limiting global
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
    message: { erro: 'Demasiadas requisições. Tente novamente mais tarde.' },
}));
// Rate limiting mais restritivo para login
app.use('/api/auth/login', (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { erro: 'Demasiadas tentativas de login.' },
}));
// ── MIDDLEWARES ───────────────────────────────────────────────
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined', {
    stream: { write: (msg) => logger_1.logger.http(msg.trim()) },
}));
// Servir ficheiros de upload
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});
// ── ROTAS API ────────────────────────────────────────────────
app.use('/api', __1.default);
// 404 para rotas não encontradas
app.use((_req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada' });
});
// ── TRATAMENTO DE ERROS ──────────────────────────────────────
app.use(error_1.errorHandler);
// ── ARRANQUE ─────────────────────────────────────────────────
async function main() {
    await (0, database_1.testConnection)();
    app.listen(PORT, () => {
        logger_1.logger.info(`🚀  Servidor a correr em http://localhost:${PORT}`);
        logger_1.logger.info(`📚  API disponível em  http://localhost:${PORT}/api`);
    });
}
main().catch((err) => {
    logger_1.logger.error('Falha ao iniciar o servidor:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map