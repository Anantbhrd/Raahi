import { Request, Response, NextFunction } from 'express';
/**
 * Authenticate device via X-Device-Key header.
 * Checks against the configured list and the devices table.
 */
export declare function authenticateDevice(req: Request, res: Response, next: NextFunction): void;
/**
 * Protect admin routes with session authentication.
 */
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
/**
 * Simple request logging.
 */
export declare function requestLogger(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map