import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

const secret = process.env.JWT_SECRET ?? 'dev_secret';

// Tipo explícito para evitar o erro de inferência de string
type Role = 'admin' | 'editor' | 'viewer';

export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token não fornecido' });
    return;
  }
  try {
    const token   = header.slice(7);
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user      = payload;
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

export function autorizar(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      res.status(403).json({ erro: 'Sem permissão para esta ação' });
      return;
    }
    next();
  };
}