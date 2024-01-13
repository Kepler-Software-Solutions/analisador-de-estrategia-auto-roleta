import { STRATEGIES_NAMES } from '@/constants';

export enum Color {
  RED = 'red',
  BLACK = 'black',
  GREEN = 'green',
}

export type StrategyName = (typeof STRATEGIES_NAMES)[number];

export type Strategy = [Color[], Color];
