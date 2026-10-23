import { beforeAll, afterAll } from 'vitest';
import { initializeSchema, closeDb, getDb } from '../db/database';
import { seedDemoData } from '../db/seed';
import path from 'path';
import fs from 'fs';

// Use a test-specific database
process.env.DB_PATH = './data/test.db';
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'false';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'testpass';
process.env.SESSION_SECRET = 'test-secret';
process.env.DEVICE_API_KEYS = 'test-device-key';

beforeAll(() => {
  const dbPath = path.resolve('./data/test.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  initializeSchema();
  seedDemoData();
});

afterAll(() => {
  closeDb();
  const dbPath = path.resolve('./data/test.db');
  if (fs.existsSync(dbPath)) {
    try { fs.unlinkSync(dbPath); } catch {}
  }
});
