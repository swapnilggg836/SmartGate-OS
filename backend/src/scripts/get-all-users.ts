import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const KNOWN_PASSWORDS = [
  'Password123!',
  '123456',
  '1234567',
  '12345678',
  'password',
  'admin'
];

async function detectPassword(hash: string): Promise<string> {
  for (const candidate of KNOWN_PASSWORDS) {
    if (await bcrypt.compare(candidate, hash)) {
      return candidate;
    }
  }
  return '[Custom Encrypted]';
}

async function main() {
  console.log('🔍 Querying all users from database...\n');

  const users = await prisma.user.findMany({
    include: {
      employee: {
        include: {
          department: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`========================================================================================`);
  console.log(`📌 TOTAL USERS IN DATABASE: ${users.length}`);
  console.log(`========================================================================================\n`);

  const summaryList = [];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const password = await detectPassword(u.passwordHash);
    const fullName = u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : 'N/A';
    const empCode = u.employee?.employeeCode || 'N/A';
    const dept = u.employee?.department?.name || 'N/A';
    const designation = u.employee?.designation || 'N/A';
    const phone = u.employee?.phone || 'N/A';

    summaryList.push({
      '#': i + 1,
      Email: u.email,
      Password: password,
      Role: u.role,
      Name: fullName,
      'Emp Code': empCode,
      Department: dept,
      Designation: designation,
      Phone: phone,
      Active: u.isActive ? 'Active' : 'Inactive'
    });
  }

  console.table(summaryList);

  console.log('\n============================== DETAILED JSON DATA ==============================');
  console.log(JSON.stringify(summaryList, null, 2));
  console.log('================================================================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Error executing get-all-users:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
