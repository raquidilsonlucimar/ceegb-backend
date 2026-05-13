import { Request, Response, NextFunction, RequestHandler } from 'express';
export declare function asyncHandler(fn: RequestHandler): RequestHandler;
export declare function errorHandler(err: Error & {
    status?: number;
    code?: string;
}, req: Request, res: Response, _next: NextFunction): void;
export declare class HttpError extends Error {
    status: number;
    constructor(status: number, message: string);
}
//# sourceMappingURL=error.d.ts.map