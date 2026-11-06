import {
  DEFAULT_SPECIES_ID,
  DEV_TEST_SPECIES_CATALOG,
  PRODUCTION_SPECIES_CATALOG,
} from './species';
import { DEFAULT_STAGE_ID, createStagesCatalog } from './stages';
import type { BattleRules, CareRules, GameData } from './types';

export const DEFAULT_CARE_RULES: CareRules = {
  defaultFullness: 5,
  minFullness: 0,
  maxFullness: 10,
  feedAmount: 1,
  fullnessDecayIntervalMs: 60 * 60 * 1_000,
  hungryThreshold: 2,
  happyThreshold: 9,
};

export const DEFAULT_BATTLE_RULES: BattleRules = {
  baseAttackIntervalMs: 3_000,
  maxActions: 200,
  resultRevealDelayMs: 900,
};

/**
 * 개발용 빌드, 브라우저 프리뷰, 자동화 테스트에서 사용하는 기본 게임 데이터셋이다.
 */
export const DEV_TEST_GAME_DATA: GameData = {
  id: 'dev-test',
  care: DEFAULT_CARE_RULES,
  species: {
    defaultSpeciesId: DEFAULT_SPECIES_ID,
    catalog: DEV_TEST_SPECIES_CATALOG,
  },
  battle: DEFAULT_BATTLE_RULES,
  stages: {
    defaultStageId: DEFAULT_STAGE_ID,
    catalog: createStagesCatalog(DEV_TEST_SPECIES_CATALOG),
  },
};

/**
 * 프로덕션(본편) 배포 환경에서 사용하는 게임 데이터셋이다.
 */
export const PRODUCTION_GAME_DATA: GameData = {
  id: 'production',
  care: DEFAULT_CARE_RULES,
  species: {
    defaultSpeciesId: DEFAULT_SPECIES_ID,
    catalog: PRODUCTION_SPECIES_CATALOG,
  },
  battle: DEFAULT_BATTLE_RULES,
  stages: {
    defaultStageId: DEFAULT_STAGE_ID,
    catalog: createStagesCatalog(PRODUCTION_SPECIES_CATALOG),
  },
};

/**
 * 현재 프로토타입과 단위 테스트가 기본으로 참조하는 활성 게임 데이터셋이다.
 */
export const GAME_DATA: GameData = DEV_TEST_GAME_DATA;

export type RuntimeEnvironmentMode = 'production' | 'development' | 'test';

export function getGameDataForMode(mode: RuntimeEnvironmentMode = 'development'): GameData {
  return mode === 'production' ? PRODUCTION_GAME_DATA : DEV_TEST_GAME_DATA;
}
