import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thisFile = fileURLToPath(import.meta.url);
export const rootDir = path.resolve(path.dirname(thisFile), '..', '..');

export const dataDir = path.join(rootDir, 'data');
export const uploadsDir = path.join(rootDir, 'uploads');
export const thumbnailsDir = path.join(rootDir, 'thumbnails');
export const logsDir = path.join(rootDir, 'logs');
export const dbFile = path.join(dataDir, 'album.sqlite');
export const failuresLogFile = path.join(logsDir, 'upload-failures.log');
