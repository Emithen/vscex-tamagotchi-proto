import type { BattleRecord } from '../battle/battle';
import { createInitialPetState, type PetState } from '../pet/pet-state';
import { DEV_TEST_GAME_DATA } from './game-data';
import type { GameData } from './types';

export type GameScenarioId =
  | 'default'
  | 'hungry-mudkip'
  | 'happy-mudkip'
  | 'marshtomp'
  | 'marshtomp-near-evolution'
  | 'swampert-max';

export type GameScenario = {
  id: GameScenarioId;
  label: string;
  gameData: GameData;
  createInitialState(now?: number): {
    pet: PetState;
    battle?: BattleRecord;
  };
};

export const GAME_SCENARIOS: Record<GameScenarioId, GameScenario> = {
  default: {
    id: 'default',
    label: '기본 시작 (물짱이)',
    gameData: DEV_TEST_GAME_DATA,
    createInitialState: (now = Date.now()) => ({
      pet: createInitialPetState(now, DEV_TEST_GAME_DATA),
    }),
  },
  'hungry-mudkip': {
    id: 'hungry-mudkip',
    label: '배고픈 물짱이 (포만감 1)',
    gameData: DEV_TEST_GAME_DATA,
    createInitialState: (now = Date.now()) => ({
      pet: {
        ...createInitialPetState(now, DEV_TEST_GAME_DATA),
        fullness: 1,
      },
    }),
  },
  'happy-mudkip': {
    id: 'happy-mudkip',
    label: '배부른 물짱이 (포만감 10)',
    gameData: DEV_TEST_GAME_DATA,
    createInitialState: (now = Date.now()) => ({
      pet: {
        ...createInitialPetState(now, DEV_TEST_GAME_DATA),
        fullness: 10,
      },
    }),
  },
  marshtomp: {
    id: 'marshtomp',
    label: '2단계 늪짱이 (EXP 0/20)',
    gameData: DEV_TEST_GAME_DATA,
    createInitialState: (now = Date.now()) => ({
      pet: {
        ...createInitialPetState(now, DEV_TEST_GAME_DATA),
        speciesId: 'marshtomp',
        name: DEV_TEST_GAME_DATA.species.catalog.marshtomp.name,
        experience: 0,
      },
    }),
  },
  'marshtomp-near-evolution': {
    id: 'marshtomp-near-evolution',
    label: '진화 직전 늪짱이 (EXP 10/20, 1승 시 대짱이)',
    gameData: DEV_TEST_GAME_DATA,
    createInitialState: (now = Date.now()) => ({
      pet: {
        ...createInitialPetState(now, DEV_TEST_GAME_DATA),
        speciesId: 'marshtomp',
        name: DEV_TEST_GAME_DATA.species.catalog.marshtomp.name,
        experience: 10,
      },
    }),
  },
  'swampert-max': {
    id: 'swampert-max',
    label: '최종 진화 대짱이 (EXP MAX)',
    gameData: DEV_TEST_GAME_DATA,
    createInitialState: (now = Date.now()) => ({
      pet: {
        ...createInitialPetState(now, DEV_TEST_GAME_DATA),
        speciesId: 'swampert',
        name: DEV_TEST_GAME_DATA.species.catalog.swampert.name,
        experience: 0,
      },
    }),
  },
};

export function isGameScenarioId(value: unknown): value is GameScenarioId {
  return typeof value === 'string' && value in GAME_SCENARIOS;
}

export function getGameScenario(scenarioId: string): GameScenario {
  if (!isGameScenarioId(scenarioId)) {
    throw new Error(
      `Tamagotchi 시나리오 조회 실패: 시나리오 "${scenarioId}"을 찾지 못했습니다. "src/data/scenarios.ts"의 "GAME_SCENARIOS" 설정을 확인하세요.`,
    );
  }

  return GAME_SCENARIOS[scenarioId];
}
