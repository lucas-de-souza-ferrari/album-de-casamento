import path from 'node:path';
import { uploadsDir, thumbnailsDir } from '../config/paths.js';
import { extractVideoFrame } from './ffmpeg.js';
import * as photoService from './photoService.js';

const POSTER_WIDTH = 800;

export async function processVideo(id, filename) {
  try {
    const videoPath = path.join(uploadsDir, filename);
    const thumbnailFilename = `${id}.jpg`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

    try {
      await extractVideoFrame(videoPath, thumbnailPath, 1, POSTER_WIDTH);
    } catch {
      // clipes com menos de ~1s nao tem frame nesse ponto; tenta do inicio.
      await extractVideoFrame(videoPath, thumbnailPath, 0, POSTER_WIDTH);
    }

    photoService.finalizeProcessing(id, { localFilename: filename, thumbnailFilename });
  } catch (err) {
    photoService.markThumbnailFailed(id, err?.message || String(err));
  }
}
