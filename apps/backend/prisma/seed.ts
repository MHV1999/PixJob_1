import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ALL_ROLES: UserRole[] = [
  UserRole.CLIENT,
  UserRole.DESIGNER,
  UserRole.MODERATOR,
  UserRole.SUPPORT,
  UserRole.FINANCE,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

async function seedRoles(): Promise<void> {
  console.warn('🌱  Seeding roles…');
  for (const name of ALL_ROLES) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  console.warn(`✅  ${String(ALL_ROLES.length)} roles seeded.`);
}

async function seedSuperAdmin(): Promise<void> {
  const email = process.env['SUPER_ADMIN_EMAIL'] ?? 'admin@pixjob.com';
  const username = 'superadmin';
  const password = process.env['SUPER_ADMIN_PASSWORD'] ?? 'SuperAdmin@123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.warn('⏭   Super admin already exists, skipping.');
    return;
  }

  const hashed = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const adminRole = await prisma.role.findUnique({ where: { name: UserRole.SUPER_ADMIN } });
  if (!adminRole) throw new Error('SUPER_ADMIN role not found — run role seed first');

  await prisma.user.create({
    data: {
      email,
      username,
      password: hashed,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE',
      userRoles: { create: [{ roleId: adminRole.id }] },
    },
  });

  console.warn(`✅  Super admin created: ${email}`);
}

async function main(): Promise<void> {
  console.warn('🌱  Starting database seed…');
  await seedRoles();
  await seedSuperAdmin();
  console.warn('✅  Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
