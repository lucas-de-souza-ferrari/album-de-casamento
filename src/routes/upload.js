import { Router } from 'express';
import { uploadMulter, validateUpload } from '../middleware/validateUpload.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';
import * as photoService from '../services/photoService.js';
import * as imageService from '../services/imageService.js';
import { signalQueue } from '../services/queueSignal.js';

export const uploadRouter = Router();

uploadRouter.post('/api/upload', uploadRateLimiter, uploadMulter, validateUpload, (req, res) => {
  const { validatedFiles, rejectedFiles, guestName, guestMessage } = req;

  for (const file of validatedFiles) {
    photoService.insertPhoto({
      id: file.id,
      guestName,
      message: guestMessage,
      localFilename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.size,
    });
    // Nao bloqueia a resposta: conversao/orientacao/thumbnail rodam em segundo
    // plano e a foto aparece na galeria assim que ficarem prontas (poucos
    // instantes depois). Erros ja sao tratados dentro de imageService.
    imageService.processPhoto(file.id, file.filename);
  }

  if (validatedFiles.length > 0) signalQueue();

  res.status(201).json({
    accepted: validatedFiles.length,
    rejected: rejectedFiles,
  });
});
