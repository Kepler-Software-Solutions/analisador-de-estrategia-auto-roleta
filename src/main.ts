import { config } from 'dotenv';

config();

import { PrismaClient } from '@prisma/client';
import { http } from './lib';

const prisma = new PrismaClient();

export const main = async () => {
  const users = await prisma.user.findMany({
    include: {
      credentials: true,
      config: true,
      bets: true,
      balanceTracks: true,
    },
    where: {
      isActive: true,
    },
  });

  const bets = users.map((user) =>
    http.post('/bet', {
      user,
      bet: 'red',
    })
  );

  console.log({ users: users.map((user) => user.email) });

  await Promise.all(bets);

  await new Promise((resolve, reject) => setTimeout(resolve, 10 * 60 * 1000));

  return 'ok';
};

async function run() {
  while (true) {
    try {
      await main();
    } catch (err) {
      await run();
    }
  }
}

run().then(console.log);
