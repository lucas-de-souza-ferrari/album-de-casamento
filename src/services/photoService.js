import { db } from '../config/db.js';
import { env } from '../config/env.js';

const insertStmt = db.prepare(`
  INSERT INTO photos (id, guest_name, message, local_filename, mime_type, size_bytes, created_at, updated_at)
  VALUES (@id, @guestName, @message, @localFilename, @mimeType, @sizeBytes, @now, @now)
`);

export function insertPhoto({ id, guestName, message, localFilename, mimeType, sizeBytes }) {
  const now = Date.now();
  insertStmt.run({
    id,
    guestName: guestName || null,
    message: message || null,
    localFilename,
    mimeType,
    sizeBytes,
    now,
  });
}

export function finalizeProcessing(id, { localFilename, thumbnailFilename }) {
  db.prepare(`
    UPDATE photos SET local_filename = ?, thumbnail_filename = ?, thumb_status = 'ready', updated_at = ? WHERE id = ?
  `).run(localFilename, thumbnailFilename, Date.now(), id);
}

export function markThumbnailFailed(id, error) {
  db.prepare(`
    UPDATE photos SET thumb_status = 'failed', last_error = ?, updated_at = ? WHERE id = ?
  `).run(String(error).slice(0, 500), Date.now(), id);
}

const claimBatchTxn = db.transaction((limit, leaseMs) => {
  const now = Date.now();
  const candidates = db.prepare(`
    SELECT id FROM photos
    WHERE status = 'pending' AND next_attempt_at <= ?
       OR (status = 'uploading' AND updated_at < ?)
    ORDER BY created_at ASC
    LIMIT ?
  `).all(now, now - leaseMs, limit);

  if (candidates.length === 0) return [];

  const ids = candidates.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE photos SET status = 'uploading', updated_at = ? WHERE id IN (${placeholders})
  `).run(now, ...ids);

  return db.prepare(`
    SELECT * FROM photos WHERE id IN (${placeholders})
  `).all(...ids);
});

export function claimBatch(limit = env.queueBatchSize, leaseSeconds = env.queueLeaseSeconds) {
  return claimBatchTxn(limit, leaseSeconds * 1000);
}

export function markUploaded(id, bucketKey) {
  db.prepare(`
    UPDATE photos SET status = 'uploaded', bucket_key = ?, last_error = NULL, updated_at = ? WHERE id = ?
  `).run(bucketKey, Date.now(), id);
}

function backoffMs(attempts) {
  const steps = [5_000, 15_000, 60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000];
  return steps[Math.min(attempts - 1, steps.length - 1)];
}

export function markFailed(id, errorMessage, maxAttempts = env.queueMaxAttempts) {
  const row = db.prepare('SELECT attempts FROM photos WHERE id = ?').get(id);
  const attempts = (row?.attempts || 0) + 1;
  const now = Date.now();

  if (attempts >= maxAttempts) {
    db.prepare(`
      UPDATE photos SET status = 'failed', attempts = ?, last_error = ?, updated_at = ? WHERE id = ?
    `).run(attempts, String(errorMessage).slice(0, 500), now, id);
  } else {
    db.prepare(`
      UPDATE photos SET status = 'pending', attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ?
    `).run(attempts, now + backoffMs(attempts), String(errorMessage).slice(0, 500), now, id);
  }

  return { attempts, gaveUp: attempts >= maxAttempts };
}

export function listInitialForGallery(limit = env.galleryPageSize) {
  return db.prepare(`
    SELECT rowid AS seq, id, guest_name AS guestName, message, thumbnail_filename AS thumbnailFilename,
           thumb_status AS thumbStatus, created_at AS createdAt
    FROM photos
    WHERE hidden = 0 AND thumb_status = 'ready'
    ORDER BY rowid DESC
    LIMIT ?
  `).all(limit);
}

export function listNewerForGallery(afterSeq, limit = env.galleryPageSize) {
  return db.prepare(`
    SELECT rowid AS seq, id, guest_name AS guestName, message, thumbnail_filename AS thumbnailFilename,
           thumb_status AS thumbStatus, created_at AS createdAt
    FROM photos
    WHERE hidden = 0 AND thumb_status = 'ready' AND rowid > ?
    ORDER BY rowid ASC
    LIMIT ?
  `).all(afterSeq, limit);
}

export function setHidden(id, hidden) {
  const info = db.prepare('UPDATE photos SET hidden = ?, updated_at = ? WHERE id = ?')
    .run(hidden ? 1 : 0, Date.now(), id);
  return info.changes > 0;
}

export function listFailed() {
  return db.prepare(`
    SELECT id, guest_name AS guestName, message, local_filename AS localFilename,
           attempts, last_error AS lastError, created_at AS createdAt, updated_at AS updatedAt
    FROM photos WHERE status = 'failed'
    ORDER BY created_at ASC
  `).all();
}

export function requeueFailed() {
  const info = db.prepare(`
    UPDATE photos SET status = 'pending', attempts = 0, next_attempt_at = 0, last_error = NULL, updated_at = ?
    WHERE status = 'failed'
  `).run(Date.now());
  return info.changes;
}

export function countByStatus() {
  return db.prepare(`
    SELECT status, COUNT(*) AS count FROM photos GROUP BY status
  `).all();
}
