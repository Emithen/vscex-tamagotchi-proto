export type PetSpeciesId = 'mudkip' | 'marshtomp' | 'swampert';

export type BattleStageId = 'grassland-1';

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
  id: PetSpeciesId;
  name: string;
  stats: CombatStats;
};

export type StageData = {
  id: BattleStageId;
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
    catalog: Record<BattleStageId, StageData>;
  };
};
