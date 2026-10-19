import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper: generate a pseudo-random normalized 128-D vector
function generateNormalizedVector(seedValue) {
  const vec = new Float32Array(128);
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    // Deterministic pseudo-random based on seed
    const val = Math.sin(seedValue * 999 + i * 37) * Math.cos(seedValue * 13 + i * 19);
    vec[i] = val;
    norm += val * val;
  }
  norm = Math.sqrt(norm);
  for (let i = 0; i < 128; i++) {
    vec[i] /= norm;
  }
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

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
      name: 'Oakridge High School',
      settings: {
        create: {
          targetFps: 30,
          modelQuality: 'medium',
          batterySaver: false,
          confidenceThreshold: 0.70,
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

  // Seed sample students with 128-D embeddings
  const sampleStudents = [
    {
      studentIdCode: 'STU-1001',
      name: 'Alex Johnson',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      seed: 1.0,
    },
    {
      studentIdCode: 'STU-1002',
      name: 'Sophia Chen',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      seed: 2.0,
    },
    {
      studentIdCode: 'STU-1003',
      name: 'Marcus Williams',
      imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      seed: 3.0,
    },
    {
      studentIdCode: 'STU-1004',
      name: 'Emily Davis',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      seed: 4.0,
    },
  ];

  const createdStudents = [];
  for (const stu of sampleStudents) {
    const student = await prisma.student.create({
      data: {
        tenantId: tenant.id,
        studentIdCode: stu.studentIdCode,
        name: stu.name,
        imageUrl: stu.imageUrl,
        embedding: generateNormalizedVector(stu.seed),
      },
    });
    createdStudents.push(student);
  }

  console.log(`🎓 Created ${createdStudents.length} sample students with 128-D embeddings.`);

  // Seed attendance for today
  await prisma.attendance.create({
    data: {
      tenantId: tenant.id,
      studentId: createdStudents[0].id,
      deviceId: 'FRONT-CAMERA-TAB-01',
      confidence: 0.89,
      timestamp: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago
    },
  });

  await prisma.attendance.create({
    data: {
      tenantId: tenant.id,
      studentId: createdStudents[1].id,
      deviceId: 'FRONT-CAMERA-TAB-01',
      confidence: 0.94,
      timestamp: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
