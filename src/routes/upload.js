import { Router } from 'express';
import { uploadMulter, validateUpload } from '../middleware/validateUpload.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';
import * as photoService from '../services/photoService.js';
import * as imageService from '../services/imageService.js';
import * as videoService from '../services/videoService.js';
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
    // Nao bloqueia a resposta: conversao/orientacao/thumbnail (ou extracao do
    // frame-poster, no caso de video) rodam em segundo plano e o item aparece
    // na galeria assim que ficar pronto. Erros ja sao tratados nos services.
    if (file.mimeType.startsWith('video/')) {
      videoService.processVideo(file.id, file.filename);
    } else {
      imageService.processPhoto(file.id, file.filename);
    }
  }

  if (validatedFiles.length > 0) signalQueue();

  res.status(201).json({
    accepted: validatedFiles.length,
    rejected: rejectedFiles,
  });
});
