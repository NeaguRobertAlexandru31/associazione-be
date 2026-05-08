import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';

const MEMBER_FIELDS = [
  'fiscalCode', 'birthPlace', 'docNumber', 'phone',
  'addressStreet', 'addressZip', 'addressCity', 'addressProvince',
] as const;

const GUARDIAN_FIELDS = ['fiscalCode', 'docNumber'] as const;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    const hex = process.env.ENCRYPTION_KEY ?? '';
    if (hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    this.key = Buffer.from(hex, 'hex');
  }

  encrypt(value: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, this.key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
  }

  decrypt(value: string): string {
    const parts = value.split(':');
    if (parts.length !== 3) return value;
    const iv      = Buffer.from(parts[0], 'base64');
    const tag     = Buffer.from(parts[1], 'base64');
    const payload = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(payload) + decipher.final('utf8');
  }

  hmac(value: string): string {
    return crypto.createHmac('sha256', this.key).update(value.toUpperCase()).digest('hex');
  }

  private isEncrypted(v: string): boolean {
    return v.split(':').length === 3;
  }

  encryptMember<T extends Record<string, unknown>>(data: T): T {
    const out: Record<string, unknown> = { ...data };
    for (const f of MEMBER_FIELDS) {
      if (typeof out[f] === 'string') out[f] = this.encrypt(out[f] as string);
    }
    if (typeof data.fiscalCode === 'string') {
      out.fiscalCodeHash = this.hmac(data.fiscalCode as string);
    }
    return out as T;
  }

  decryptMember<T extends Record<string, unknown>>(data: T): T {
    const out: Record<string, unknown> = { ...data };
    for (const f of MEMBER_FIELDS) {
      const v = out[f];
      if (typeof v === 'string' && this.isEncrypted(v)) out[f] = this.decrypt(v);
    }
    return out as T;
  }

  encryptGuardian<T extends Record<string, unknown>>(data: T): T {
    const out: Record<string, unknown> = { ...data };
    for (const f of GUARDIAN_FIELDS) {
      if (typeof out[f] === 'string') out[f] = this.encrypt(out[f] as string);
    }
    if (typeof data.fiscalCode === 'string') {
      out.fiscalCodeHash = this.hmac(data.fiscalCode as string);
    }
    return out as T;
  }

  decryptGuardian<T extends Record<string, unknown>>(data: T): T {
    const out: Record<string, unknown> = { ...data };
    for (const f of GUARDIAN_FIELDS) {
      const v = out[f];
      if (typeof v === 'string' && this.isEncrypted(v)) out[f] = this.decrypt(v);
    }
    return out as T;
  }
}
