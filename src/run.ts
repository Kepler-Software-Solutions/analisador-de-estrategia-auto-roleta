import axios from 'axios';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  while (true) {
    console.log({ new: 'loop' });

    const users = await prisma.user.findMany({
      include: {
        credentials: true,
        config: true,
        bets: true,
        balanceTracks: true,
      },
      where: {
        isActive: true,
        // config: {
        //   strategy,
        // },
      },
    });

    console.log({ users: users.length });

    const bets = users.map(async (user) => {
      return await axios.post('https://www.autoroleta.com/api/bet', {
        user,
        bet: 'red',
      });
    });

    await Promise.all(bets);

    console.log({ waiting: '5 minutes' });

    await new Promise((resolve, reject) => setTimeout(resolve, 5 * 60 * 1000));
  }

  return 'done';
}

main().then(console.log);
