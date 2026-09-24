import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private get client() {
    return new S3Client({ region: process.env.AWS_REGION_NAME ?? 'eu-central-1' });
  }

  private get bucket() {
    return process.env.S3_BUCKET!;
  }

  private get cdnUrl() {
    return process.env.CDN_URL!;
  }

  async upload(key: string, buffer: Buffer, contentType = 'image/webp'): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket:       this.bucket,
        Key:          key,
        Body:         buffer,
        ContentType:  contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return `${this.cdnUrl}/${key}`;
  }

  async delete(urlOrKey: string): Promise<void> {
    const key = urlOrKey.startsWith('http')
      ? urlOrKey.replace(`${this.cdnUrl}/`, '')
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
