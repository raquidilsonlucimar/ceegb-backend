"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.asyncHandler = asyncHandler;
exports.errorHandler = errorHandler;
const logger_1 = require("../config/logger");
// Wrapper para async route handlers — captura erros automaticamente
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Resposta de erro padronizada
function errorHandler(err, req, res, _next) {
    logger_1.logger.error({ message: err.message, stack: err.stack, url: req.url });
    // Erros de duplicidade MySQL
    if (err.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ erro: 'Registo duplicado — verifique os campos únicos' });
        return;
    }
    const status = err.status ?? 500;
    const message = process.env.NODE_ENV === 'production' && status === 500
        ? 'Erro interno do servidor'
        : err.message;
    res.status(status).json({ erro: message });
}
// Helper para erros HTTP rápidos
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.HttpError = HttpError;
//# sourceMappingURL=error.js.map