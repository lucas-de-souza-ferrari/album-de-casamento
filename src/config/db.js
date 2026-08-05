import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { dataDir, dbFile } from './paths.js';

fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbFile);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

const thisFile = fileURLToPath(import.meta.url);
const migrationPath = path.join(path.dirname(thisFile), '..', 'db', 'migrations', '001_init.sql');
db.exec(fs.readFileSync(migrationPath, 'utf8'));
