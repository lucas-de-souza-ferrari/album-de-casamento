import 'dotenv/config';

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

export const env = {
  port: int('PORT', 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  coupleNames: process.env.COUPLE_NAMES || 'Os Noivos',
  weddingDate: process.env.WEDDING_DATE || '',
  siteUrl: process.env.SITE_URL || `http://localhost:${int('PORT', 3000)}`,

  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3Region: process.env.S3_REGION || 'us-east-1',
  s3Bucket: process.env.S3_BUCKET || '',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  s3Prefix: process.env.S3_PREFIX || 'uploads/',

  maxFileSizeMb: int('MAX_FILE_SIZE_MB', 20),
  maxFilesPerRequest: int('MAX_FILES_PER_REQUEST', 15),
  maxRequestSizeMb: int('MAX_REQUEST_SIZE_MB', 150),
  guestTextMaxLength: int('GUEST_TEXT_MAX_LENGTH', 140),

  queueTickMs: int('QUEUE_TICK_MS', 2000),
  queueBatchSize: int('QUEUE_BATCH_SIZE', 20),
  queueUploadConcurrency: int('QUEUE_UPLOAD_CONCURRENCY', 5),
  queueLeaseSeconds: int('QUEUE_LEASE_SECONDS', 60),
  queueMaxAttempts: int('QUEUE_MAX_ATTEMPTS', 6),

  uploadRateLimitWindowMinutes: int('UPLOAD_RATE_LIMIT_WINDOW_MINUTES', 15),
  uploadRateLimitMax: int('UPLOAD_RATE_LIMIT_MAX', 30),

  galleryPageSize: int('GALLERY_PAGE_SIZE', 24),
  galleryModToken: process.env.GALLERY_MOD_TOKEN || '',
};
