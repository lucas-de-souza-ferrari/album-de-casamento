import '../src/config/db.js';
import * as photoService from '../src/services/photoService.js';
import { signalQueue } from '../src/services/queueSignal.js';

const count = photoService.requeueFailed();

if (count === 0) {
  console.log('Nenhuma foto com falha definitiva para reprocessar.');
} else {
  console.log(`${count} foto(s) voltaram para status "pending" e serão reprocessadas pelo worker.`);
  signalQueue();
}

process.exit(0);
