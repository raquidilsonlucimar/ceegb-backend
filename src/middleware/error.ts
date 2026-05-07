import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../config/logger';

// Wrapper para async route handlers — captura erros automaticamente
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Resposta de erro padronizada
export function errorHandler(
  err: Error & { status?: number; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error({ message: err.message, stack: err.stack, url: req.url });

  // Erros de duplicidade MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    res.status(409).json({ erro: 'Registo duplicado — verifique os campos únicos' });
    return;
  }

  const status = err.status ?? 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Erro interno do servidor'
      : err.message;

  res.status(status).json({ erro: message });
}

// Helper para erros HTTP rápidos
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
