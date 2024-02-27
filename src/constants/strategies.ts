import { Strategy, StrategyName } from '@/types';
import { Color } from '@/types/strategy';

export const STRATEGIES_NAMES = [
  'Estratégia Rei Roleta',
  'Estratégia Órfãos',
  'Estratégia Polêmica',
  'Estratégia Matadora',
  'Estrátegia Zerinho',
] as const;

export const STRATEGIES: Record<StrategyName, Strategy> = {
  'Estratégia Rei Roleta': [[Color.RED, Color.BLACK, Color.BLACK], Color.RED],
  'Estratégia Órfãos': [[Color.BLACK, Color.RED, Color.BLACK], Color.BLACK],
  'Estratégia Polêmica': [[Color.BLACK, Color.BLACK, Color.RED], Color.RED],
  'Estratégia Matadora': [[Color.RED, Color.RED, Color.BLACK], Color.BLACK],
  'Estrátegia Zerinho': [[Color.RED, Color.BLACK, Color.BLACK], Color.RED],
} as const;
