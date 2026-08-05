import path from 'node:path';
import QRCode from 'qrcode';
import { env } from '../src/config/env.js';
import { rootDir } from '../src/config/paths.js';

const targetUrl = `${env.siteUrl.replace(/\/$/, '')}/upload`;
const outFile = path.join(rootDir, 'qrcode-convidados.png');

await QRCode.toFile(outFile, targetUrl, {
  width: 1000,
  margin: 2,
  color: { dark: '#0B3D57', light: '#FFFFFF' },
});

console.log(`QR code gerado em: ${outFile}`);
console.log(`Aponta para: ${targetUrl}`);
console.log('Imprima ou exiba esse QR code no local da festa.');
