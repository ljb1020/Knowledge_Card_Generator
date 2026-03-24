import Database from 'better-sqlite3';
import path from 'path';
import { initSeedData } from './jobs.js';
import { resolveProjectPath } from '../utils/loadEnv.js';

export { initSeedData };

const STORAGE_DIR = resolveProjectPath(process.env.APP_STORAGE_DIR ?? './storage');
const DB_PATH = path.join(STORAGE_DIR, 'app.db');

// Ensure storage dir exists
import fs from 'fs';
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create jobs table
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    status TEXT NOT NULL,
    progress_message TEXT,
    stage1_draft TEXT,
    stage2_raw TEXT,
    document_json TEXT,
    image_paths_json TEXT NOT NULL DEFAULT '[]',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const jobColumns = db.prepare(`PRAGMA table_info(jobs)`).all() as Array<{ name: string }>;
if (!jobColumns.some((column) => column.name === 'progress_message')) {
  db.exec(`ALTER TABLE jobs ADD COLUMN progress_message TEXT`);
}

export default db;
