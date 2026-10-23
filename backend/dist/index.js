"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_session_1 = __importDefault(require("express-session"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const database_1 = require("./db/database");
const seed_1 = require("./db/seed");
const auth_1 = require("./middleware/auth");
const public_1 = __importDefault(require("./routes/public"));
const device_1 = __importDefault(require("./routes/device"));
const admin_1 = __importDefault(require("./routes/admin"));
const simulator_1 = require("./engine/simulator");
const app = (0, express_1.default)();
// ── Security ──
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: config_1.config.cors.origin,
    credentials: true
}));
// ── Body parsing ──
app.use(express_1.default.json({ limit: '1mb' }));
// ── Session ──
app.use((0, express_session_1.default)({
    secret: config_1.config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config_1.config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax',
    },
}));
// ── Rate limiting ──
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests' },
});
app.use('/api/', apiLimiter);
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts' },
});
app.use('/api/v1/admin/login', authLimiter);
// ── Logging ──
app.use(auth_1.requestLogger);
// ── Routes ──
app.use('/api', public_1.default);
app.use('/api', device_1.default);
app.use('/api', admin_1.default);
// ── Initialize ──
if (process.env.NODE_ENV !== 'test') {
    (0, database_1.initializeSchema)();
    (0, seed_1.seedDemoData)();
    // ── Start simulator in demo mode ──
    if (config_1.config.demoMode) {
        (0, simulator_1.startSimulator)();
    }
}
// ── Start server ──
if (process.env.NODE_ENV !== 'test') {
    app.listen(config_1.config.port, () => {
        console.log(`\n╔══════════════════════════════════════════════╗`);
        console.log(`║   Smart Bus Tracking System — Backend        ║`);
        console.log(`╠══════════════════════════════════════════════╣`);
        console.log(`║  Port:      ${String(config_1.config.port).padEnd(33)}║`);
        console.log(`║  Mode:      ${(config_1.config.nodeEnv).padEnd(33)}║`);
        console.log(`║  Demo:      ${String(config_1.config.demoMode).padEnd(33)}║`);
        console.log(`║  Database:  ${config_1.config.dbPath.padEnd(33)}║`);
        console.log(`╚══════════════════════════════════════════════╝\n`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map