export type PetSpeciesId = 'mudkip' | 'marshtomp' | 'swampert';

export type BattleFieldId = 'grassland' | 'beach' | 'marsh' | 'cave' | 'volcano';

export type BattleStageId =
  | 'grassland-1'
  | 'grassland-2'
  | 'grassland-3'
  | 'beach-1'
  | 'beach-2'
  | 'beach-3'
  | 'marsh-1'
  | 'marsh-2'
  | 'marsh-3'
  | 'cave-1'
  | 'cave-2'
  | 'cave-3'
  | 'volcano-1'
  | 'volcano-2'
  | 'volcano-3';

export type EnemySpeciesId =
  | 'seedot'
  | 'beautifly'
  | 'breloom'
  | 'wingull'
  | 'corphish'
  | 'crawdaunt'
  | 'gulpin'
  | 'seviper'
  | 'whiscash'
  | 'aron'
  | 'nosepass'
  | 'aggron'
  | 'numel'
  | 'torkoal'
  | 'groudon';

export type SpriteSetId = PetSpeciesId | EnemySpeciesId;

export type CombatStats = {
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
};

export type SpeciesEvolution = {
  requiredExperience: number;
  nextSpeciesId: PetSpeciesId;
};

export type SpeciesData = {
  id: PetSpeciesId;
  name: string;
  stats: CombatStats;
  evolution?: SpeciesEvolution;
};

export type CareRules = {
  defaultFullness: number;
  minFullness: number;
  maxFullness: number;
  feedAmount: number;
  fullnessDecayIntervalMs: number;
  hungryThreshold: number;
  happyThreshold: number;
};

export type BattleRules = {
  baseAttackIntervalMs: number;
  maxActions: number;
  resultRevealDelayMs: number;
};

export type StageEnemyData = {
  id: EnemySpeciesId | PetSpeciesId;
  name: string;
  pokedexNumber: number;
  spriteId: SpriteSetId;
  stats: CombatStats;
};

export type FieldData = {
  id: BattleFieldId;
  name: string;
  themeTypes: string;
  stageIds: readonly [BattleStageId, BattleStageId, BattleStageId];
};

export type StageData = {
  id: BattleStageId;
  fieldId: BattleFieldId;
  stageNumber: 1 | 2 | 3;
  name: string;
  enemy: StageEnemyData;
  victoryExperience: number;
};

export type GameDataId = 'production' | 'dev-test' | (string & {});

export type GameData = {
  id: GameDataId;
  care: CareRules;
  species: {
    defaultSpeciesId: PetSpeciesId;
    catalog: Record<PetSpeciesId, SpeciesData>;
  };
  battle: BattleRules;
  stages: {
    defaultStageId: BattleStageId;
    fields: Record<BattleFieldId, FieldData>;
    catalog: Record<BattleStageId, StageData>;
  };
};
