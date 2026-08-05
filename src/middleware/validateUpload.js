import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromFile } from 'file-type';
import { uploadsDir } from '../config/paths.js';
import { env } from '../config/env.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}.upload`),
});

export const uploadMulter = multer({
  storage,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
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
// nao for uma imagem suportada. Tambem aplica o limite de tamanho total do lote.
export async function validateUpload(req, res, next) {
  const files = req.files || [];
  const accepted = [];
  const rejected = [];
  let totalSize = 0;

  for (const file of files) {
    const detected = await fileTypeFromFile(file.path).catch(() => null);

    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      await fs.unlink(file.path).catch(() => {});
      rejected.push({ originalName: file.originalname, reason: 'formato não suportado' });
      continue;
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
