import fs from 'node:fs';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/s3.js';
import { env } from '../config/env.js';

export async function uploadFile(localPath, filename, mimeType) {
  const key = `${env.s3Prefix}${filename}`;
  const body = fs.createReadStream(localPath);
  const stats = fs.statSync(localPath);

  await s3Client.send(new PutObjectCommand({
    Bucket: env.s3Bucket,
    Key: key,
    Body: body,
    ContentType: mimeType || 'application/octet-stream',
    ContentLength: stats.size,
  }));

  return key;
}

export async function deleteFile(key) {
  if (!key) return;
  await s3Client.send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: key }));
}
