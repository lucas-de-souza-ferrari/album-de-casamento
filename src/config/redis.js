import Redis from 'ioredis';
import { env } from './env.js';

export const QUEUE_SIGNAL_KEY = 'album:queue:signal';

export function createRedisClient(extraOptions = {}) {
  // maxRetriesPerRequest baixo faz um comando enfileirado (offline queue
  // continua ligada, que e o default) desistir e rejeitar em poucos segundos
  // se o Redis estiver fora do ar, em vez de esperar indefinidamente a
  // reconexao. O objetivo e degradar (rate-limit falha aberto, fila cai pro
  // polling puro), nunca travar uma requisicao esperando o Redis.
  const client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 2,
    ...extraOptions,
  });

  // Sem isto, um evento 'error' sem listener derruba o processo inteiro
  // (comportamento padrao de EventEmitter). O app precisa sobreviver ao
  // Redis cair/ficar indisponivel — so degrada (ver queueSignal.js).
  client.on('error', (err) => {
    console.error(`Redis: ${err.message}`);
  });

  return client;
}
