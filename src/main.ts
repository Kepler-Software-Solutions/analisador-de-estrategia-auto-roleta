import { Color, Strategy, StrategyName } from "@/types";
import { API } from "@/entities";
import { PrismaClient } from "@prisma/client";
import { http } from "./lib";
import { CREDENTIALS, BETS, STRATEGIES } from "./constants";

const prisma = new PrismaClient();

export const main = async () => {
  const api = new API();
  const colors: Color[] = [];

  const { success } = await api.authenticate(CREDENTIALS);

  if (!success) {
    return "could not authenticate";
  }

  const getColorByNumber = (result: number): Color | null => {
    for (const color in BETS) {
      if (BETS[color as Color].includes(result)) {
        return color as Color;
      }
    }

    return null; // Retorna null se não for encontrada nenhuma cor
  };

  await api.connect();

  api.getRealtimeResults(async (result) => {
    const color = getColorByNumber(Number(result));

    if (!color) {
      throw new Error("Color not found");
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
      "" as StrategyName
    );

    if (matchedStrategyName) {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          config: {
            strategy: matchedStrategyName,
          },
        },
      });

      const bets = users.map((user) => http.post("/bet", user));
      await Promise.all(bets);
    }
  });
};

main().then(() => console.log("Server is running"));
