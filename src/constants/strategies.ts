import { Strategy, StrategyName } from '@/types';
import { Color } from '@/types/strategy';

export const STRATEGIES_NAMES = [
  'Super Estratégia',
  'Roleta Super',
  'Dinheiro Easy',
  'Tudo ou nada',
  'Hora do show',
] as const;

export const STRATEGIES: Record<StrategyName, Strategy> = {
  'Super Estratégia': [[Color.RED, Color.BLACK, Color.BLACK], Color.RED],
  'Dinheiro Easy': [[Color.BLACK, Color.RED, Color.RED], Color.BLACK],
  'Hora do show': [[Color.BLACK, Color.BLACK, Color.BLACK], Color.RED],
  'Roleta Super': [[Color.RED, Color.RED, Color.RED], Color.BLACK],
  'Tudo ou nada': [[Color.RED, Color.BLACK, Color.RED], Color.BLACK],
} as const;
