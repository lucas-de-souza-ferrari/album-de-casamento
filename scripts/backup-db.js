import fs from 'node:fs';
import path from 'node:path';
import { dataDir, dbFile } from '../src/config/paths.js';

const backupsDir = path.join(dataDir, 'backups');
fs.mkdirSync(backupsDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const destFile = path.join(backupsDir, `album-${stamp}.sqlite`);

// Copia o arquivo principal e, se existirem, o WAL/SHM (journal_mode=WAL pode
// manter mudancas recentes so no .wal ate um checkpoint).
fs.copyFileSync(dbFile, destFile);
for (const suffix of ['-wal', '-shm']) {
  const sideFile = `${dbFile}${suffix}`;
  if (fs.existsSync(sideFile)) {
    fs.copyFileSync(sideFile, `${destFile}${suffix}`);
  }
}

console.log(`Backup salvo em: ${destFile}`);
console.log('Dica: rode isso via cron (ex: a cada 15 min durante o evento) para nao depender so do disco do VPS.');
