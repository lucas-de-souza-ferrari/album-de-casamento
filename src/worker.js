import fs from 'node:fs';
import path from 'node:path';
import pLimit from 'p-limit';
import { env } from './config/env.js';
import { logsDir, uploadsDir, failuresLogFile } from './config/paths.js';
import './config/db.js';
import * as photoService from './services/photoService.js';
import * as bucketService from './services/bucketService.js';
import { createRedisClient } from './config/redis.js';
import { waitForSignalOrTimeout } from './services/queueSignal.js';

fs.mkdirSync(logsDir, { recursive: true });

// BRPOP so aceita timeout em segundos inteiros.
const tickSeconds = Math.max(1, Math.round(env.queueTickMs / 1000));
const limit = pLimit(env.queueUploadConcurrency);
const signalClient = createRedisClient();

let running = true;
let currentBatch = Promise.resolve();

function logFailure(entry) {
  const line = `${JSON.stringify({ ...entry, ts: new Date().toISOString() })}\n`;
  fs.appendFile(failuresLogFile, line, () => {});
}

async function uploadOne(photo) {
  try {
    const localPath = path.join(uploadsDir, photo.local_filename);
    const bucketKey = await bucketService.uploadFile(localPath, photo.local_filename, photo.mime_type);
    photoService.markUploaded(photo.id, bucketKey);
  } catch (err) {
    const message = err?.message || String(err);
    const { attempts, gaveUp } = photoService.markFailed(photo.id, message);
    if (gaveUp) {
      logFailure({ id: photo.id, guestName: photo.guest_name, localFilename: photo.local_filename, attempts, error: message });
    }
  }
}

// Reivindica um lote pendente no SQLite (fonte de verdade) e sobe para o
// bucket com concorrencia limitada. Ver photoService.claimBatch para o
// mecanismo de "claim + lease" que recupera lotes de um worker que travou.
async function processBatchOnce() {
  const batch = photoService.claimBatch(env.queueBatchSize, env.queueLeaseSeconds);
  if (batch.length === 0) return;
  console.log(`album-worker: subindo lote de ${batch.length} foto(s) para o bucket`);
  await Promise.all(batch.map((photo) => limit(() => uploadOne(photo))));
}

async function loop() {
  while (running) {
    currentBatch = processBatchOnce();
    await currentBatch;
    if (!running) break;
    // Aguarda ate `tickSeconds` OU acorda antes se um upload novo sinalizar
    // via Redis. Se o Redis cair, cai para espera simples — nunca trava.
    await waitForSignalOrTimeout(signalClient, tickSeconds);
  }
}

async function shutdown(signal) {
  console.log(`album-worker: recebido ${signal}, aguardando lote em andamento terminar...`);
  running = false;
  await currentBatch;
  signalClient.disconnect();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log(`album-worker: iniciado (tick de ${tickSeconds}s, concorrencia ${env.queueUploadConcurrency})`);
loop();
