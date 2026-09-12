import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.member.upsert({
    where: { id: 'seed-superadmin-id' },
    update: {},
    create: {
      id: 'seed-superadmin-id',
      firstName: 'Admin',
      lastName: 'Associazione',
      email: 'admin@associazione.it',
      passwordHash,
      role: 'SUPERADMIN',
      status: 'attivo',
    },
  });

  console.log('Admin creato:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
