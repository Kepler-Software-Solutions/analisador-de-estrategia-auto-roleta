import axios from 'axios';

import { PrismaClient } from '@prisma/client';
// import { Bot } from './server/entities';
import { Color, User } from './types';
// import { decrypt } from './actions/cryptography';
import { STRATEGIES, STRATEGIES_NAMES } from '@/constants';

import { faker } from '@faker-js/faker';

// import { API } from '@/server/entities';

// const CREDENTIALS = {
//   email: 'felipeteste@gmail.com',
//   password: '123456',
// } as const;

const prisma = new PrismaClient();

async function operate(user: User, bet: 'red' | 'black') {
  try {
    const URL = 'https://www.autoroleta.com/api/bet';

    await axios.post(URL, {
      user,
      bet,
    });

    console.log('success with', user.email);

    return true;
  } catch (err) {
    console.log('error with', user.email);
    return false;
  }
}

// async function operate(user: User, bet: 'red' | 'black') {
//   user.credentials!.password = await decrypt(user.credentials!.password);

//   console.log({ ref: '/ref', decrypted: user.credentials!.password });

//   const bot = new Bot(user);

//   const connected = await bot.init();

//   console.log({ ref: '/ref', connected });

//   if (!connected) {
//     return Response.json('invalid credentials', { status: 200 });
//   }

//   await bot.operate({
//     color: { red: Color.RED, black: Color.BLACK }[bet],
//   });
// }

async function main() {
  while (true) {
    // const api = new API();

    // const authentication = await api.authenticate(CREDENTIALS);

    // if (!authentication.success) {
    //   return false;
    // }

    // const connected = await api.connect();

    // if (!connected) {
    //   return false;
    // }

    console.log({ new: 'loop' });

    const strategy = faker.helpers.arrayElement(STRATEGIES_NAMES);
    // const strategy = 'Estratégia Rei Roleta';

    console.log({ strategy });

    const users = (await prisma.user.findMany({
      include: {
        credentials: true,
        config: true,
        bets: true,
        balanceTracks: true,
      },
      where: {
        isActive: true,
        config: {
          strategy,
        },
      },
    })) as User[];

    console.log({ users: users.length });

    // await api.waitForBetsToOpen();

    // api.disconnect();

    const bets = users.map(async (user) => await operate(user, 'red'));

    await Promise.all(bets);

    console.log({ waiting: '10 minutes' });

    await new Promise((resolve, reject) => setTimeout(resolve, 10 * 60 * 1000));
  }

  return 'done';
}

main().then(console.log);
