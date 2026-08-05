import { Router } from 'express';
import { env } from '../config/env.js';
import * as photoService from '../services/photoService.js';

export const galleryRouter = Router();

galleryRouter.get('/galeria', (req, res) => {
  const photos = photoService.listInitialForGallery(env.galleryPageSize);
  const canModerate = Boolean(env.galleryModToken) && req.query.mod === env.galleryModToken;

  res.render('gallery', {
    coupleNames: env.coupleNames,
    photos,
    canModerate,
    modToken: canModerate ? env.galleryModToken : '',
  });
});

galleryRouter.get('/api/photos', (req, res) => {
  const afterSeq = Number.parseInt(req.query.afterSeq, 10) || 0;
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || env.galleryPageSize, 50);
  const photos = photoService.listNewerForGallery(afterSeq, limit);
  res.json({ photos });
});

galleryRouter.patch('/api/photos/:id/hide', (req, res) => {
  if (!env.galleryModToken || req.query.mod !== env.galleryModToken) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }
  const ok = photoService.setHidden(req.params.id, true);
  if (!ok) return res.status(404).json({ error: 'Foto não encontrada.' });
  res.json({ ok: true });
});
