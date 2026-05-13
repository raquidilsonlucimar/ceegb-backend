import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../types';
export declare function autenticar(req: Request, res: Response, next: NextFunction): void;
export declare function autorizar(...roles: JwtPayload['role'][]): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map