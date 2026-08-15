import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env.js';
import { rootDir, uploadsDir, thumbnailsDir } from './config/paths.js';
import './config/db.js';
import { pagesRouter } from './routes/pages.js';
import { uploadRouter } from './routes/upload.js';
import { galleryRouter } from './routes/gallery.js';
import { errorHandler } from './middleware/errorHandler.js';

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(thumbnailsDir, { recursive: true });

const app = express();

// Atras do Nginx (proxy reverso) — necessario para req.ip/rate-limit usarem o
// IP real do convidado (X-Forwarded-For) em vez do IP interno do proxy.
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(rootDir, 'views'));
// Muda a cada restart do processo; usado para invalidar o cache de 7d do /js e /css nos guests.
app.locals.assetVersion = Date.now();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Os previews de upload usam URL.createObjectURL(file), que gera src blob:.
        'img-src': ["'self'", 'data:', 'blob:'],
        'media-src': ["'self'", 'blob:'],
        // Desativado: forcaria o navegador a tentar HTTPS pra CSS/JS/uploads
        // mesmo quando o site roda em HTTP puro (sem dominio/certificado),
        // quebrando o carregamento silenciosamente.
        'upgrade-insecure-requests': null,
      },
    },
  })
);
app.use(compression());
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

app.use('/css', express.static(path.join(rootDir, 'src', 'public', 'css'), { maxAge: '7d' }));
app.use('/js', express.static(path.join(rootDir, 'src', 'public', 'js'), { maxAge: '7d' }));
app.use('/images', express.static(path.join(rootDir, 'src', 'public', 'images'), { maxAge: '7d' }));

// Em producao o Nginx deve servir estes dois caminhos diretamente do disco
// (ver deploy/nginx.album.conf.example); manter aqui garante que tambem
// funcione em desenvolvimento local sem Nginx na frente.
app.use('/uploads', express.static(uploadsDir, { maxAge: '365d', immutable: true }));
app.use('/thumbnails', express.static(thumbnailsDir, { maxAge: '365d', immutable: true }));

app.use(pagesRouter);
app.use(uploadRouter);
app.use(galleryRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`album-web ouvindo na porta ${env.port} (${env.nodeEnv})`);
});
