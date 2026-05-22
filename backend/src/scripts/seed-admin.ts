import bcrypt from 'bcrypt';
import prisma from '../config/prisma';

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin seed...');

    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@agorich.com',
        password: hashedPassword,
        name: 'Super Admin',
        mobile: '9999999999',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: admin123');
    console.log('⚠️ Please change the password immediately after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
