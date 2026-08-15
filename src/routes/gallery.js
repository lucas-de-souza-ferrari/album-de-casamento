import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { env } from '../config/env.js';
import { uploadsDir, thumbnailsDir } from '../config/paths.js';
import * as photoService from '../services/photoService.js';
import * as bucketService from '../services/bucketService.js';
import { deleteRateLimiter } from '../middleware/rateLimit.js';

export const galleryRouter = Router();

galleryRouter.get('/galeria', (req, res) => {
  const photos = photoService.listInitialForGallery(env.galleryPageSize);
  res.render('gallery', { coupleNames: env.coupleNames, photos });
});

galleryRouter.get('/api/photos', (req, res) => {
  const afterSeq = Number.parseInt(req.query.afterSeq, 10) || 0;
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || env.galleryPageSize, 50);
  const photos = photoService.listNewerForGallery(afterSeq, limit);
  res.json({ photos });
});

galleryRouter.delete('/api/photos/:id', deleteRateLimiter, async (req, res) => {
  if (req.body?.password !== env.galleryDeletePassword) {
    return res.status(403).json({ error: 'Senha incorreta.' });
  }

  const photo = photoService.getById(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Foto não encontrada.' });

  photoService.deletePhoto(photo.id);

  await Promise.all([
    photo.localFilename
      ? fs.unlink(path.join(uploadsDir, photo.localFilename)).catch(() => {})
      : null,
    photo.thumbnailFilename
      ? fs.unlink(path.join(thumbnailsDir, photo.thumbnailFilename)).catch(() => {})
      : null,
    photo.bucketKey ? bucketService.deleteFile(photo.bucketKey).catch(() => {}) : null,
  ]);

  res.json({ ok: true });
});
