"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.closeDb = closeDb;
exports.initializeSchema = initializeSchema;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const sqliteModule = process.getBuiltinModule
    ? process.getBuiltinModule('node:sqlite')
    : eval("require('node:sqlite')");
const DatabaseSync = sqliteModule.DatabaseSync;
let db;
function getDb() {
    if (!db) {
        const dbDir = path_1.default.dirname(path_1.default.resolve(config_1.config.dbPath));
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        db = new DatabaseSync(path_1.default.resolve(config_1.config.dbPath));
        db.exec('PRAGMA journal_mode = WAL');
        db.exec('PRAGMA foreign_keys = ON');
    }
    return db;
}
function closeDb() {
    if (db) {
        db.close();
        db = undefined;
    }
}
function initializeSchema() {
    const database = getDb();
    database.exec(`
    -- Routes
    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#000000',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Stops
    CREATE TABLE IF NOT EXISTS stops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Route-Stop assignments (ordered)
    CREATE TABLE IF NOT EXISTS route_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      stop_id TEXT NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
      stop_order INTEGER NOT NULL,
      UNIQUE(route_id, stop_id),
      UNIQUE(route_id, stop_order)
    );

    -- Buses
    CREATE TABLE IF NOT EXISTS buses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      device_id TEXT UNIQUE,
      route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
      enabled INTEGER DEFAULT 1,
      latitude REAL,
      longitude REAL,
      speed_kmph REAL,
      heading REAL,
      gps_fix INTEGER DEFAULT 0,
      network_registered INTEGER DEFAULT 0,
      network_data INTEGER DEFAULT 0,
      last_telemetry_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Devices  
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      bus_id TEXT REFERENCES buses(id) ON DELETE SET NULL,
      api_key TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      last_seen_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Telemetry history
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      bus_id TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      speed_kmph REAL,
      heading REAL,
      gps_fix INTEGER DEFAULT 0,
      network_registered INTEGER,
      network_data INTEGER,
      device_timestamp TEXT,
      server_timestamp TEXT DEFAULT (datetime('now')),
      event_type TEXT DEFAULT 'periodic_location',
      is_demo INTEGER DEFAULT 0
    );

    -- Authorized RFID cards
    CREATE TABLE IF NOT EXISTS authorized_cards (
      id TEXT PRIMARY KEY,
      card_token TEXT NOT NULL UNIQUE,
      alias TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_version INTEGER DEFAULT 1
    );

    -- RFID events
    CREATE TABLE IF NOT EXISTS rfid_events (
      id TEXT PRIMARY KEY,
      bus_id TEXT,
      card_token_masked TEXT NOT NULL,
      card_token_hash TEXT,
      event_type TEXT NOT NULL,
      authorized INTEGER NOT NULL,
      event_timestamp TEXT NOT NULL,
      server_timestamp TEXT DEFAULT (datetime('now')),
      stop_id TEXT,
      latitude REAL,
      longitude REAL,
      source TEXT DEFAULT 'device',
      is_demo INTEGER DEFAULT 0
    );

    -- Crowd observations
    CREATE TABLE IF NOT EXISTS crowd_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stop_id TEXT NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
      observed_at TEXT NOT NULL,
      count INTEGER NOT NULL,
      source TEXT DEFAULT 'manual',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Configuration  
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_telemetry_bus ON telemetry(bus_id, server_timestamp);
    CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry(device_id, server_timestamp);
    CREATE INDEX IF NOT EXISTS idx_rfid_events_bus ON rfid_events(bus_id, event_timestamp);
    CREATE INDEX IF NOT EXISTS idx_rfid_events_time ON rfid_events(event_timestamp);
    CREATE INDEX IF NOT EXISTS idx_crowd_obs_stop ON crowd_observations(stop_id, observed_at);
    CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id, stop_order);
  `);
}
//# sourceMappingURL=database.js.map