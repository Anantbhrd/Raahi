import { getDb, initializeSchema, closeDb } from './database';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

// Reset the database by deleting the file and re-creating schema + seed
const dbPath = path.resolve(config.dbPath);
if (fs.existsSync(dbPath)) {
  closeDb();
  fs.unlinkSync(dbPath);
  console.log(`[RESET] Deleted ${dbPath}`);
}

initializeSchema();

// Dynamically import seed to avoid circular issues
import('./seed').then(({ seedDemoData }) => {
  seedDemoData();
  closeDb();
  console.log('[RESET] Database reset complete.');
});
