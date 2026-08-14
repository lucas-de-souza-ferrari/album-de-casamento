import { Router } from 'express';
import { env } from '../config/env.js';

export const pagesRouter = Router();

pagesRouter.get('/', (req, res) => {
  res.render('index', { coupleNames: env.coupleNames, weddingDate: env.weddingDate });
});

pagesRouter.get('/upload', (req, res) => {
  res.render('upload', {
    coupleNames: env.coupleNames,
    weddingDate: env.weddingDate,
    maxFiles: env.maxFilesPerRequest,
    maxFileSizeMb: env.maxFileSizeMb,
    maxVideoFileSizeMb: env.maxVideoFileSizeMb,
    maxVideoDurationSeconds: env.maxVideoDurationSeconds,
    guestTextMaxLength: env.guestTextMaxLength,
  });
});
