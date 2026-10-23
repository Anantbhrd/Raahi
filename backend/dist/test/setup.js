"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const database_1 = require("../db/database");
const seed_1 = require("../db/seed");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Use a test-specific database
process.env.DB_PATH = './data/test.db';
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'false';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'testpass';
process.env.SESSION_SECRET = 'test-secret';
process.env.DEVICE_API_KEYS = 'test-device-key';
(0, vitest_1.beforeAll)(() => {
    const dbPath = path_1.default.resolve('./data/test.db');
    if (fs_1.default.existsSync(dbPath)) {
        fs_1.default.unlinkSync(dbPath);
    }
    (0, database_1.initializeSchema)();
    (0, seed_1.seedDemoData)();
});
(0, vitest_1.afterAll)(() => {
    (0, database_1.closeDb)();
    const dbPath = path_1.default.resolve('./data/test.db');
    if (fs_1.default.existsSync(dbPath)) {
        try {
            fs_1.default.unlinkSync(dbPath);
        }
        catch { }
    }
});
//# sourceMappingURL=setup.js.map