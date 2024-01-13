import { Color, Strategy, StrategyName } from '@/types';
import { API } from '@/entities';
import { PrismaClient, User } from '@prisma/client';
import { http } from './lib';
import { CREDENTIALS, BETS, STRATEGIES } from './constants';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

export const main = async () => {
  const api = new API();
  const colors: Color[] = [];

  const { success } = await api.authenticate(CREDENTIALS);

  if (!success) {
    return 'could not authenticate';
  }

  const getColorByNumber = (result: number): Color | null => {
    for (const color in BETS) {
      if (BETS[color as Color].includes(result)) {
        return color as Color;
      }
    }

    return null;
  };

  await api.connect();

  api.getRealtimeResults(async (result) => {
    const color = getColorByNumber(Number(result));

    console.log({ color });

    if (!color) {
      throw new Error('Color not found');
    }

    colors.push(color);

    const entries = Object.entries(STRATEGIES) as Array<
      [StrategyName, Strategy]
    >;

    const matchedStrategyName = entries.reduce(
      (acc, [strategyName, [strategy]]) => {
        const results = colors.slice(
          Math.max(colors.length - strategy.length, 0)
        );

        const isEqual = results.toString() === strategy.toString();

        if (isEqual) {
          return strategyName as StrategyName;
        }

        return acc;
      },
      '' as StrategyName
    );

    console.log({ matchedStrategyName });

    if (matchedStrategyName) {
      const users: User[] = await prisma.user.findMany({
        include: {
          credentials: true,
          config: true,
          bets: true,
          balanceTracks: true,
        },
        where: {
          isActive: true,
          // config: {
          //   strategy: matchedStrategyName,
          // },
        },
      });

      const bets = users.map((user) =>
        http.post('/bet', { user, bet: STRATEGIES[matchedStrategyName][1] })
      );

      console.log({ users: users.map((user) => user.email) });

      await Promise.all(bets);
    }
  });
};

main();

while (true);
