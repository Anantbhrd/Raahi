import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  get port() { return parseInt(process.env.PORT || '3001', 10); },
  get nodeEnv() { return process.env.NODE_ENV || 'development'; },
  get dbPath() { return process.env.DB_PATH || './data/smartbus.db'; },
  get demoMode() { return process.env.DEMO_MODE !== 'false'; },
  admin: {
    get username() { return process.env.ADMIN_USERNAME || 'admin'; },
    get password() { return process.env.ADMIN_PASSWORD || 'smartbus2026'; },
  },
  session: {
    get secret() { return process.env.SESSION_SECRET || 'change-this-to-a-random-string-in-production'; },
  },
  get deviceApiKeys() {
    return (process.env.DEVICE_API_KEYS || 'demo-device-key-001').split(',').map(k => k.trim());
  },
  cors: {
    get origin() { return process.env.CORS_ORIGIN || 'http://localhost:5173'; },
  },
  get staleTimeoutSec() { return parseInt(process.env.STALE_TIMEOUT_SEC || '60', 10); },
  get telemetryHistoryDays() { return parseInt(process.env.TELEMETRY_HISTORY_DAYS || '30', 10); },
  eta: {
    get defaultSpeedKmph() { return parseFloat(process.env.DEFAULT_BUS_SPEED_KMPH || '20'); },
  },
};
