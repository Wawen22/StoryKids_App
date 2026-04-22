import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../config.js';

const cfg = getConfig();

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${cfg.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: cfg.R2_ACCESS_KEY_ID,
    secretAccessKey: cfg.R2_SECRET_ACCESS_KEY,
  },
});

export async function createPresignedPutUrl(key: string, ttlSeconds = 900): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: cfg.R2_BUCKET_NAME,
    Key: key,
    ContentType: 'image/jpeg',
  });
  return getSignedUrl(r2, cmd, { expiresIn: ttlSeconds });
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: cfg.R2_BUCKET_NAME, Key: key }));
}

export async function uploadBytes(key: string, bytes: Buffer, contentType: string): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: cfg.R2_BUCKET_NAME,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }),
  );
}

export function publicUrl(key: string): string {
  return cfg.R2_PUBLIC_BASE_URL ? `${cfg.R2_PUBLIC_BASE_URL}/${key}` : key;
}
