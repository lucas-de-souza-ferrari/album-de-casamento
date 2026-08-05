import { createRedisClient, QUEUE_SIGNAL_KEY } from '../config/redis.js';

let publisher;

function getPublisher() {
  if (!publisher) publisher = createRedisClient();
  return publisher;
}

export function signalQueue() {
  getPublisher().lpush(QUEUE_SIGNAL_KEY, '1').catch(() => {
    // Redis fora do ar: sem problema, o worker continua via polling puro a cada tick.
  });
}

export async function waitForSignalOrTimeout(client, timeoutSeconds) {
  try {
    await client.brpop(QUEUE_SIGNAL_KEY, timeoutSeconds);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, timeoutSeconds * 1000));
  }
}
