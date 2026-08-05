import '../src/config/db.js';
import * as photoService from '../src/services/photoService.js';

const failed = photoService.listFailed();
const counts = photoService.countByStatus();

console.log('Status geral da fila:');
counts.forEach((row) => console.log(`  ${row.status}: ${row.count}`));

if (failed.length === 0) {
  console.log('\nNenhuma foto com falha definitiva de upload ao bucket. Tudo certo!');
} else {
  console.log(`\n${failed.length} foto(s) com falha definitiva (excederam as tentativas):\n`);
  failed.forEach((photo) => {
    console.log(`- ${photo.id} | convidado: ${photo.guestName || '(sem nome)'} | tentativas: ${photo.attempts}`);
    console.log(`  arquivo: ${photo.localFilename}`);
    console.log(`  erro: ${photo.lastError}`);
  });
  console.log('\nDica: depois de corrigir a causa (ex: credenciais do bucket), rode `npm run requeue-failed`.');
}
