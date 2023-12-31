import { BETS, Color } from "@/types";
import { API } from "@/entities";
import { PrismaClient } from "@prisma/client";
import { http } from "./lib";

const CREDENTIALS = {
  email: "felipeteste@gmail.com",
  password: "123456789",
};

const prisma = new PrismaClient();

export const main = async () => {
  const api = new API();
  const colors: Color[] = [];

  const { success, balance } = await api.authenticate(CREDENTIALS);

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

    if (colors.length >= 3) {
      const [antipenultimateColor, penultimateColor, lastColor] = [
        ...colors,
      ].reverse();

      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          config: {
            strategy: {
              antipenultimateColor,
              penultimateColor,
              lastColor,
            },
          },
        },
      });

      // TO-DO: Make request to /bet route
      const bets = users.map((user) => http.post("/bet", user));
      await Promise.all(bets);
    }
  });
};

main().then(() => console.log("Server is running"));
