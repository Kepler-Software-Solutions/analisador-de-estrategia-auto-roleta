import { PrismaClient, User } from '@prisma/client';

import { add } from 'date-fns';

const prisma = new PrismaClient();

async function updateLicense(user: User) {
  return await prisma.user.update({
    data: {
      licensedUntil: add(new Date(), {
        days: 1 * 30,
      }),
    },
    where: {
      userId: user.userId,
    },
  });
}

async function main() {
  const users = await prisma.user.findMany();

  for (let user of users) {
    await updateLicense(user);
  }
}

main().then(console.log);
