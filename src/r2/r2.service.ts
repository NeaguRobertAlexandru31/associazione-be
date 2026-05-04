import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class R2Service {
  private get client() {
    return new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  private get bucket() {
    return process.env.R2_BUCKET!;
  }

  private get publicUrl() {
    return process.env.R2_PUBLIC_URL!; // es. https://pub-xxx.r2.dev
  }

  async upload(key: string, buffer: Buffer, contentType = 'image/webp'): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket:      this.bucket,
        Key:         key,
        Body:        buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return `${this.publicUrl}/${key}`;
  }

  async delete(urlOrKey: string): Promise<void> {
    const key = urlOrKey.startsWith('http')
      ? urlOrKey.replace(`${this.publicUrl}/`, '')
      : urlOrKey;

    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      // file già rimosso o inesistente — non bloccare l'operazione
    }
  }

  async deleteMany(urls: string[]): Promise<void> {
    await Promise.all(urls.map(u => this.delete(u)));
  }
}
