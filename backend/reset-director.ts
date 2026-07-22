import { PrismaClient, UserStatus } from '@prisma/client';
import { hashPassword } from './src/shared/security/password.js';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword('EMP-DIR-001');

  await prisma.user.update({
    where: {
      employeeNumber: 'EMP-DIR-001',
    },
    data: {
      passwordHash,
      isFirstLogin: true,
      status: UserStatus.PENDING_FIRST_LOGIN,
    },
  });

  console.log('Director password has been reset successfully.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });