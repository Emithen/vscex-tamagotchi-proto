import type { BattleFieldId, BattleStageId, FieldData, StageData } from './types';

export const GRASSLAND_STAGE_ID: BattleStageId = 'grassland-1';
export const DEFAULT_STAGE_ID: BattleStageId = GRASSLAND_STAGE_ID;
export const BATTLE_VICTORY_EXPERIENCE = 10;

export const BATTLE_FIELD_IDS: readonly BattleFieldId[] = [
  'grassland',
  'beach',
  'marsh',
  'cave',
  'volcano',
] as const;

export const BATTLE_STAGE_IDS: readonly BattleStageId[] = [
  'grassland-1',
  'grassland-2',
  'grassland-3',
  'beach-1',
  'beach-2',
  'beach-3',
  'marsh-1',
  'marsh-2',
  'marsh-3',
  'cave-1',
  'cave-2',
  'cave-3',
  'volcano-1',
  'volcano-2',
  'volcano-3',
] as const;

export function createFieldsCatalog(): Record<BattleFieldId, FieldData> {
  return {
    grassland: {
      id: 'grassland',
      name: '초원',
      themeTypes: '풀·벌레',
      stageIds: ['grassland-1', 'grassland-2', 'grassland-3'],
    },
    beach: {
      id: 'beach',
      name: '해변',
      themeTypes: '물·비행',
      stageIds: ['beach-1', 'beach-2', 'beach-3'],
    },
    marsh: {
      id: 'marsh',
      name: '진흙 습지',
      themeTypes: '독·습지',
      stageIds: ['marsh-1', 'marsh-2', 'marsh-3'],
    },
    cave: {
      id: 'cave',
      name: '바위 동굴',
      themeTypes: '바위·강철',
      stageIds: ['cave-1', 'cave-2', 'cave-3'],
    },
    volcano: {
      id: 'volcano',
      name: '화산 지대',
      themeTypes: '불꽃·땅',
      stageIds: ['volcano-1', 'volcano-2', 'volcano-3'],
    },
  };
}

export function createStagesCatalog(): Record<BattleStageId, StageData> {
  return {
    'grassland-1': {
      id: 'grassland-1',
      fieldId: 'grassland',
      stageNumber: 1,
      name: '초원 1',
      enemy: {
        id: 'seedot',
        name: '도토링',
        pokedexNumber: 273,
        spriteId: 'seedot',
        stats: { maxHp: 20, attack: 10, defense: 5, speed: 100 },
      },
      victoryExperience: BATTLE_VICTORY_EXPERIENCE,
    },
    'grassland-2': {
      id: 'grassland-2',
      fieldId: 'grassland',
      stageNumber: 2,
      name: '초원 2',
      enemy: {
        id: 'beautifly',
        name: '뷰티플라이',
        pokedexNumber: 267,
        spriteId: 'beautifly',
        stats: { maxHp: 24, attack: 7, defense: 5, speed: 105 },
      },
      victoryExperience: 15,
    },
    'grassland-3': {
      id: 'grassland-3',
      fieldId: 'grassland',
      stageNumber: 3,
      name: '초원 3',
      enemy: {
        id: 'breloom',
        name: '버섯모',
        pokedexNumber: 286,
        spriteId: 'breloom',
        stats: { maxHp: 28, attack: 13, defense: 8, speed: 105 },
      },
      victoryExperience: 25,
    },
    'beach-1': {
      id: 'beach-1',
      fieldId: 'beach',
      stageNumber: 1,
      name: '해변 1',
      enemy: {
        id: 'wingull',
        name: '갈모매',
        pokedexNumber: 278,
        spriteId: 'wingull',
        stats: { maxHp: 26, attack: 11, defense: 6, speed: 115 },
      },
      victoryExperience: 20,
    },
    'beach-2': {
      id: 'beach-2',
      fieldId: 'beach',
      stageNumber: 2,
      name: '해변 2',
      enemy: {
        id: 'corphish',
        name: '가재군',
        pokedexNumber: 341,
        spriteId: 'corphish',
        stats: { maxHp: 32, attack: 15, defense: 10, speed: 100 },
      },
      victoryExperience: 25,
    },
    'beach-3': {
      id: 'beach-3',
      fieldId: 'beach',
      stageNumber: 3,
      name: '해변 3',
      enemy: {
        id: 'crawdaunt',
        name: '가재장군',
        pokedexNumber: 342,
        spriteId: 'crawdaunt',
        stats: { maxHp: 36, attack: 16, defense: 12, speed: 105 },
      },
      victoryExperience: 35,
    },
    'marsh-1': {
      id: 'marsh-1',
      fieldId: 'marsh',
      stageNumber: 1,
      name: '진흙 습지 1',
      enemy: {
        id: 'gulpin',
        name: '꼴깍몬',
        pokedexNumber: 316,
        spriteId: 'gulpin',
        stats: { maxHp: 38, attack: 13, defense: 14, speed: 95 },
      },
      victoryExperience: 30,
    },
    'marsh-2': {
      id: 'marsh-2',
      fieldId: 'marsh',
      stageNumber: 2,
      name: '진흙 습지 2',
      enemy: {
        id: 'seviper',
        name: '세비퍼',
        pokedexNumber: 336,
        spriteId: 'seviper',
        stats: { maxHp: 36, attack: 16, defense: 10, speed: 110 },
      },
      victoryExperience: 40,
    },
    'marsh-3': {
      id: 'marsh-3',
      fieldId: 'marsh',
      stageNumber: 3,
      name: '진흙 습지 3',
      enemy: {
        id: 'whiscash',
        name: '메깅',
        pokedexNumber: 340,
        spriteId: 'whiscash',
        stats: { maxHp: 44, attack: 18, defense: 14, speed: 105 },
      },
      victoryExperience: 50,
    },
    'cave-1': {
      id: 'cave-1',
      fieldId: 'cave',
      stageNumber: 1,
      name: '바위 동굴 1',
      enemy: {
        id: 'aron',
        name: '가보리',
        pokedexNumber: 304,
        spriteId: 'aron',
        stats: { maxHp: 36, attack: 17, defense: 20, speed: 95 },
      },
      victoryExperience: 45,
    },
    'cave-2': {
      id: 'cave-2',
      fieldId: 'cave',
      stageNumber: 2,
      name: '바위 동굴 2',
      enemy: {
        id: 'nosepass',
        name: '코코파스',
        pokedexNumber: 299,
        spriteId: 'nosepass',
        stats: { maxHp: 44, attack: 19, defense: 26, speed: 100 },
      },
      victoryExperience: 55,
    },
    'cave-3': {
      id: 'cave-3',
      fieldId: 'cave',
      stageNumber: 3,
      name: '바위 동굴 3',
      enemy: {
        id: 'aggron',
        name: '보스로라',
        pokedexNumber: 306,
        spriteId: 'aggron',
        stats: { maxHp: 48, attack: 24, defense: 28, speed: 105 },
      },
      victoryExperience: 70,
    },
    'volcano-1': {
      id: 'volcano-1',
      fieldId: 'volcano',
      stageNumber: 1,
      name: '화산 지대 1',
      enemy: {
        id: 'numel',
        name: '둔타',
        pokedexNumber: 322,
        spriteId: 'numel',
        stats: { maxHp: 42, attack: 21, defense: 14, speed: 105 },
      },
      victoryExperience: 60,
    },
    'volcano-2': {
      id: 'volcano-2',
      fieldId: 'volcano',
      stageNumber: 2,
      name: '화산 지대 2',
      enemy: {
        id: 'torkoal',
        name: '코터스',
        pokedexNumber: 324,
        spriteId: 'torkoal',
        stats: { maxHp: 50, attack: 23, defense: 24, speed: 100 },
      },
      victoryExperience: 75,
    },
    'volcano-3': {
      id: 'volcano-3',
      fieldId: 'volcano',
      stageNumber: 3,
      name: '화산 지대 3',
      enemy: {
        id: 'groudon',
        name: '그란돈',
        pokedexNumber: 383,
        spriteId: 'groudon',
        stats: { maxHp: 54, attack: 26, defense: 20, speed: 120 },
      },
      victoryExperience: 100,
    },
  };
}

export const FIELDS_CATALOG: Record<BattleFieldId, FieldData> = createFieldsCatalog();
export const STAGES_CATALOG: Record<BattleStageId, StageData> = createStagesCatalog();
