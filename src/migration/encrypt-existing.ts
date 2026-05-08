/**
 * One-shot migration: cifra i campi sensibili dei Member e Guardian già presenti nel DB.
 * Esecuzione: ENCRYPTION_KEY=<hex> npx ts-node -r tsconfig-paths/register src/migration/encrypt-existing.ts
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY  = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

const MEMBER_FIELDS  = ['fiscalCode', 'birthPlace', 'docNumber', 'phone', 'addressStreet', 'addressZip', 'addressCity', 'addressProvince'] as const;
const GUARDIAN_FIELDS = ['fiscalCode', 'docNumber'] as const;

function encrypt(value: string): string {
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const data   = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
}

function hmac(value: string): string {
  return crypto.createHmac('sha256', KEY).update(value.toUpperCase()).digest('hex');
}

const isEncrypted = (v: string) => v.split(':').length === 3;

async function main() {
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY mancante o non valida (deve essere 64 char hex)');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  // ── Members ────────────────────────────────────────────────────────────────
  const members = await prisma.member.findMany();
  console.log(`Cifratura ${members.length} soci...`);
  let mDone = 0;

  for (const m of members) {
    if (isEncrypted(m.fiscalCode)) { mDone++; continue; }

    const update: Record<string, unknown> = {};
    for (const f of MEMBER_FIELDS) {
      const val = (m as any)[f] as string | null;
      if (val) update[f] = encrypt(val);
    }
    update.fiscalCodeHash = hmac(m.fiscalCode);

    await prisma.member.update({ where: { id: m.id }, data: update });
    mDone++;
  }
  console.log(`✔  Soci migrati: ${mDone}`);

  // ── Guardians ──────────────────────────────────────────────────────────────
  const guardians = await prisma.guardian.findMany();
  console.log(`Cifratura ${guardians.length} tutori...`);
  let gDone = 0;

  for (const g of guardians) {
    if (isEncrypted(g.fiscalCode)) { gDone++; continue; }

    const update: Record<string, unknown> = {};
    for (const f of GUARDIAN_FIELDS) {
      const val = (g as any)[f] as string | null;
      if (val) update[f] = encrypt(val);
    }
    update.fiscalCodeHash = hmac(g.fiscalCode);

    await prisma.guardian.update({ where: { id: g.id }, data: update });
    gDone++;
  }
  console.log(`✔  Tutori migrati: ${gDone}`);

  await prisma.$disconnect();
  console.log('Migrazione completata.');
}

main().catch(err => { console.error(err); process.exit(1); });
