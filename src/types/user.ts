import { Config, Prisma } from '@prisma/client'

import { StrategyName } from '@/types'

type UserConfig = Omit<Config, 'strategy'> & {
  strategy: StrategyName
}

type PrismaUser = Prisma.UserGetPayload<{
  include: {
    balanceTracks: true
    bets: true
    config: true
    credentials: true
  }
}>

export type User = Omit<PrismaUser, 'config'> & {
  config?: UserConfig
}
