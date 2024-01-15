import { decrypt } from '@/actions/cryptography';
import { Bot } from '@/server/entities';

import type { Color, User } from '@/types';

interface BetProps {
  user: User;
  bet: {
    color: Color;
  };
}

export async function bet({ user, bet }: BetProps) {
  user.credentials!.password = await decrypt(user.credentials!.password);

  console.log({ ref: '/ref', decrypted: user.credentials!.password });

  const bot = new Bot(user);

  const connected = await bot.init();

  console.log({ ref: '/ref', connected });

  if (!connected) {
    return Response.json('invalid credentials', { status: 200 });
  }

  await bot.operate(bet);

  return Response.json('bet performed successfully', {
    status: 200,
  });
}
