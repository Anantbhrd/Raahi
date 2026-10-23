import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initializeSchema, getDb } from './db/database';
import { seedDemoData } from './db/seed';
import { requestLogger } from './middleware/auth';
import publicRoutes from './routes/public';
import deviceRoutes from './routes/device';
import adminRoutes from './routes/admin';
import { startSimulator } from './engine/simulator';

const app = express();

// ── Security ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ 
  origin: config.cors.origin, 
  credentials: true 
}));

// ── Body parsing ──
app.use(express.json({ limit: '1mb' }));

// ── Session ──
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
}));

// ── Rate limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests' },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts' },
});
app.use('/api/v1/admin/login', authLimiter);

// ── Logging ──
app.use(requestLogger);

// ── Routes ──
app.use('/api', publicRoutes);
app.use('/api', deviceRoutes);
app.use('/api', adminRoutes);

// ── Initialize ──
if (process.env.NODE_ENV !== 'test') {
  initializeSchema();
  seedDemoData();

  // ── Start simulator in demo mode ──
  if (config.demoMode) {
    startSimulator();
  }
}

// ── Start server ──
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║   Smart Bus Tracking System — Backend        ║`);
    console.log(`╠══════════════════════════════════════════════╣`);
    console.log(`║  Port:      ${String(config.port).padEnd(33)}║`);
    console.log(`║  Mode:      ${(config.nodeEnv).padEnd(33)}║`);
    console.log(`║  Demo:      ${String(config.demoMode).padEnd(33)}║`);
    console.log(`║  Database:  ${config.dbPath.padEnd(33)}║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);
  });
}

export default app;
