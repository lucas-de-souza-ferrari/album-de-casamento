import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { uploadsDir, thumbnailsDir } from '../config/paths.js';
import * as photoService from './photoService.js';

const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);
const THUMBNAIL_WIDTH = 800;
const THUMBNAIL_QUALITY = 78;

async function normalizeAndThumbnail(id, originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  const originalPath = path.join(uploadsDir, originalFilename);
  let workingPath = originalPath;
  let finalFilename = originalFilename;

  if (HEIC_EXTENSIONS.has(ext)) {
    const inputBuffer = await fs.readFile(originalPath);
    const jpegBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.9 });
    finalFilename = `${id}.jpg`;
    const jpegPath = path.join(uploadsDir, finalFilename);
    await fs.writeFile(jpegPath, jpegBuffer);
    await fs.unlink(originalPath);
    workingPath = jpegPath;
  }

  // rotate() auto-orients using the EXIF orientation tag; sharp strips metadata
  // (including GPS) on output by default since withMetadata() is never called.
  const workingExt = path.extname(workingPath);
  const normalizedTemp = path.join(uploadsDir, `${id}.normalizing${workingExt}`);
  await sharp(workingPath).rotate().toFile(normalizedTemp);
  await fs.rename(normalizedTemp, workingPath);

  const thumbnailFilename = `${id}.jpg`;
  const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
  await sharp(workingPath)
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toFile(thumbnailPath);

  return { finalFilename, thumbnailFilename };
}

export async function processPhoto(id, originalFilename) {
  try {
    const { finalFilename, thumbnailFilename } = await normalizeAndThumbnail(id, originalFilename);
    photoService.finalizeProcessing(id, { localFilename: finalFilename, thumbnailFilename });
  } catch (err) {
    photoService.markThumbnailFailed(id, err?.message || String(err));
  }
}
