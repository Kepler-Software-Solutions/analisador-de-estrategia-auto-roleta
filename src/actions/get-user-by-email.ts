'use server'
import { User } from '@/types'
import { prisma } from '@/config/prisma'

export async function getUserByEmail(email: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      balanceTracks: true,
      bets: true,
      config: true,
      credentials: true,
    },
  })

  return user as User
}
