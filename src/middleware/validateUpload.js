import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromFile } from 'file-type';
import { uploadsDir } from '../config/paths.js';
import { env } from '../config/env.js';
import { getVideoDurationSeconds } from '../services/ffmpeg.js';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}.upload`),
});

export const uploadMulter = multer({
  storage,
  limits: {
    // O limite por tipo (foto vs video) e aplicado depois, em validateUpload,
    // uma vez que os magic bytes reais foram checados.
    fileSize: Math.max(env.maxFileSizeMb, env.maxVideoFileSizeMb) * 1024 * 1024,
    files: env.maxFilesPerRequest,
  },
}).array('photos', env.maxFilesPerRequest);

function sanitizeGuestText(value) {
  if (!value) return null;
  const printableOnly = Array.from(String(value))
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join('');
  const cleaned = printableOnly.trim().slice(0, env.guestTextMaxLength);
  return cleaned || null;
}

// Valida cada arquivo pelos magic bytes reais (nunca confiar no mimetype/nome
// declarado pelo navegador), renomeia para <uuid>.<ext-real> e descarta o que
// nao for foto/video suportado. Tambem aplica o limite de tamanho por tipo,
// duracao maxima de video, e o tamanho total do lote.
export async function validateUpload(req, res, next) {
  const files = req.files || [];
  const accepted = [];
  const rejected = [];
  let totalSize = 0;

  for (const file of files) {
    const detected = await fileTypeFromFile(file.path).catch(() => null);
    const isImage = Boolean(detected && ALLOWED_IMAGE_MIME_TYPES.has(detected.mime));
    const isVideo = Boolean(detected && ALLOWED_VIDEO_MIME_TYPES.has(detected.mime));

    if (!isImage && !isVideo) {
      await fs.unlink(file.path).catch(() => {});
      rejected.push({ originalName: file.originalname, reason: 'formato não suportado' });
      continue;
    }

    if (isImage && file.size > env.maxFileSizeMb * 1024 * 1024) {
      await fs.unlink(file.path).catch(() => {});
      rejected.push({ originalName: file.originalname, reason: `imagem excede ${env.maxFileSizeMb}MB` });
      continue;
    }

    if (isVideo) {
      if (file.size > env.maxVideoFileSizeMb * 1024 * 1024) {
        await fs.unlink(file.path).catch(() => {});
        rejected.push({ originalName: file.originalname, reason: `vídeo excede ${env.maxVideoFileSizeMb}MB` });
        continue;
      }

      const duration = await getVideoDurationSeconds(file.path).catch(() => null);
      if (duration !== null && duration > env.maxVideoDurationSeconds) {
        await fs.unlink(file.path).catch(() => {});
        rejected.push({ originalName: file.originalname, reason: `vídeo excede ${env.maxVideoDurationSeconds}s` });
        continue;
      }
    }

    totalSize += file.size;
    accepted.push({ file, detected });
  }

  if (totalSize > env.maxRequestSizeMb * 1024 * 1024) {
    await Promise.all(accepted.map(({ file }) => fs.unlink(file.path).catch(() => {})));
    return res.status(413).json({ error: 'Lote de fotos excede o tamanho total permitido.' });
  }

  const validated = [];
  for (const { file, detected } of accepted) {
    const id = uuidv4();
    const finalFilename = `${id}.${detected.ext}`;
    await fs.rename(file.path, path.join(uploadsDir, finalFilename));
    validated.push({
      id,
      filename: finalFilename,
      mimeType: detected.mime,
      size: file.size,
    });
  }

  req.validatedFiles = validated;
  req.rejectedFiles = rejected;
  req.guestName = sanitizeGuestText(req.body?.guestName);
  req.guestMessage = sanitizeGuestText(req.body?.message);
  next();
}
