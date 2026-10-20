import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data for idempotent seeding
  await prisma.attendance.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.tenantSettings.deleteMany({});
  await prisma.tenant.deleteMany({});

  // Create default tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "St. Joseph's College Colombo 10",
      settings: {
        create: {
          targetFps: 30,
          modelQuality: 'medium',
          batterySaver: false,
          confidenceThreshold: 0.48, // Strict biometric threshold: distance <= 0.48
        },
      },
    },
  });

  // Create default admin: admin@verity.edu / admin123
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  const admin = await prisma.admin.create({
    data: {
      email: 'admin@verity.edu',
      passwordHash,
      tenantId: tenant.id,
    },
  });

  console.log(`👤 Admin created: ${admin.email} (password: admin123) for tenant: ${tenant.name}`);
  console.log('✅ Seeding completed: Database is clean and ready for real student face enrollments (no fake mock data).');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
