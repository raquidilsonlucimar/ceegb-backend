import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
export declare const uploadProjeto: multer.Multer;
export declare const uploadRelatorio: multer.Multer;
export declare const uploadGeral: multer.Multer;
/**
 * POST /api/upload/projeto/:id/documento
 * Faz upload de um ficheiro e regista como documento do projeto
 */
export declare function uploadDocumentoProjeto(req: Request, res: Response): Promise<void>;
/**
 * POST /api/upload/relatorio/:id/documento
 * Faz upload do PDF principal de um relatório e actualiza o campo url_documento
 */
export declare function uploadDocumentoRelatorio(req: Request, res: Response): Promise<void>;
/**
 * POST /api/upload/geral
 * Upload genérico — devolve a URL pública sem associar a nenhum registo
 */
export declare function uploadGeral_(req: Request, res: Response): Promise<void>;
/**
 * DELETE /api/upload/documento/:docId
 * Remove o documento do disco e da BD
 */
export declare function removerDocumento(req: Request, res: Response): Promise<void>;
/**
 * GET /api/upload/info
 * Informação sobre configuração de uploads (tamanho máx, tipos, etc.)
 */
export declare function infoUpload(_req: Request, res: Response): Promise<void>;
export declare function multerErrorHandler(err: Error & {
    code?: string;
}, _req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=uploadController.d.ts.map