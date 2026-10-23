"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateDevice = authenticateDevice;
exports.requireAdmin = requireAdmin;
exports.requestLogger = requestLogger;
const config_1 = require("../config");
/**
 * Authenticate device via X-Device-Key header.
 * Checks against the configured list and the devices table.
 */
function authenticateDevice(req, res, next) {
    const apiKey = req.headers['x-device-key'];
    if (!apiKey) {
        res.status(401).json({ error: 'Missing X-Device-Key header' });
        return;
    }
    if (!config_1.config.deviceApiKeys.includes(apiKey)) {
        res.status(403).json({ error: 'Invalid device key' });
        return;
    }
    next();
}
/**
 * Protect admin routes with session authentication.
 */
function requireAdmin(req, res, next) {
    if (!req.session?.isAdmin) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    next();
}
/**
 * Simple request logging.
 */
function requestLogger(req, _res, next) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
}
//# sourceMappingURL=auth.js.map