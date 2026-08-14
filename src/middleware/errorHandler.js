import multer from 'multer';
import { env } from '../config/env.js';

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `Arquivo excede o tamanho máximo (fotos: ${env.maxFileSizeMb}MB · vídeos: ${env.maxVideoFileSizeMb}MB).`,
  LIMIT_FILE_COUNT: `Envie no máximo ${env.maxFilesPerRequest} fotos/vídeos por vez.`,
  LIMIT_UNEXPECTED_FILE: `Envie no máximo ${env.maxFilesPerRequest} fotos/vídeos por vez.`,
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: MULTER_MESSAGES[err.code] || 'Falha ao processar o envio.' });
  }

  console.error(err);
  res.status(500).json({ error: 'Algo deu errado no servidor. Tente novamente em instantes.' });
}
