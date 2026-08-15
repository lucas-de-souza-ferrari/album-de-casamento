import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createRedisClient } from '../config/redis.js';
import { env } from '../config/env.js';

const redisClient = createRedisClient();

// Limite generoso e por IP: numa festa, dezenas de convidados costumam dividir
// o mesmo IP publico da rede Wi-Fi do local (NAT). Isso funciona como defesa
// contra abuso/bot, nao como um limite "por pessoa".
const baseUploadRateLimiter = rateLimit({
  windowMs: env.uploadRateLimitWindowMinutes * 60 * 1000,
  limit: env.uploadRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'album:rl:',
    sendCommand: (...args) => redisClient.call(...args),
  }),
  message: { error: 'Muitos envios a partir deste endereço. Aguarde alguns minutos e tente novamente.' },
});

// Se o Redis cair, o limitador nao deve travar o upload de ninguem: falha
// aberto (deixa passar) em vez de derrubar a requisicao ou ficar pendurado.
export function uploadRateLimiter(req, res, next) {
  baseUploadRateLimiter(req, res, (err) => {
    if (err) {
      console.error('Rate limiter indisponível (Redis fora do ar?), permitindo requisição:', err.message);
      return next();
    }
    next();
  });
}

// Senha de remocao e curta (4 digitos): limite apertado por IP para tornar
// forca bruta impraticavel, sem travar convidados legitimos que erraram uma vez.
const baseDeleteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'album:rl:delete:',
    sendCommand: (...args) => redisClient.call(...args),
  }),
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

export function deleteRateLimiter(req, res, next) {
  baseDeleteRateLimiter(req, res, (err) => {
    if (err) {
      console.error('Rate limiter indisponível (Redis fora do ar?), permitindo requisição:', err.message);
      return next();
    }
    next();
  });
}
