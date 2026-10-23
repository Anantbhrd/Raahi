import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Authenticate device via X-Device-Key header.
 * Checks against the configured list and the devices table.
 */
export function authenticateDevice(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-device-key'] as string;
  if (!apiKey) {
    res.status(401).json({ error: 'Missing X-Device-Key header' });
    return;
  }
  if (!config.deviceApiKeys.includes(apiKey)) {
    res.status(403).json({ error: 'Invalid device key' });
    return;
  }
  next();
}

/**
 * Protect admin routes with session authentication.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!(req.session as any)?.isAdmin) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

/**
 * Simple request logging.
 */
export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}
