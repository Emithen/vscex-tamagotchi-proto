export const BASE_ATTACK_INTERVAL_MS = 3_000;
export const MAX_BATTLE_ACTIONS = 200;
export const GRASSLAND_STAGE_ID = 'grassland-1';
export const BATTLE_VICTORY_EXPERIENCE = 10;

export type CombatStats = {
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
};

export type Combatant = {
  id: string;
  name: string;
  stats: CombatStats;
};

export type BattleAction = {
  atMs: number;
  actor: 'pet' | 'enemy';
  damage: number;
  targetHp: number;
};

export type BattleResult = 'victory' | 'defeat' | 'draw';

export type BattleSimulation = {
  result: BattleResult;
  durationMs: number;
  actions: BattleAction[];
};

export type BattleRecord = BattleSimulation & {
  id: string;
  stageId: BattleStageId;
  startedAt: number;
  pet: Combatant;
  enemy: Combatant;
  experienceReward: number;
  rewardClaimed: boolean;
};

export const MUDKIP_COMBATANT: Combatant = {
  id: 'mudkip',
  name: '물짱이',
  stats: {
    maxHp: 20,
    attack: 10,
    defense: 5,
    speed: 100,
  },
};

export type BattleStageId = typeof GRASSLAND_STAGE_ID;

export type BattleStage = {
  id: BattleStageId;
  name: string;
  enemy: Combatant;
  victoryExperience: number;
};

export const GRASSLAND_STAGE: BattleStage = {
  id: GRASSLAND_STAGE_ID,
  name: '초원 1',
  enemy: MUDKIP_COMBATANT,
  victoryExperience: BATTLE_VICTORY_EXPERIENCE,
};

const BATTLE_STAGES: ReadonlyMap<string, BattleStage> = new Map([
  [GRASSLAND_STAGE.id, GRASSLAND_STAGE],
]);

export function getBattleStage(stageId: string): BattleStage {
  const stage = BATTLE_STAGES.get(stageId);

  if (!stage) {
    throw new Error(
      `전투 스테이지 조회 실패: 스테이지 "${stageId}"을 찾지 못했습니다. "src/battle/battle.ts"의 "BATTLE_STAGES" 설정을 확인하세요.`,
    );
  }

  return stage;
}

export function calculateDamage(attacker: CombatStats, defender: CombatStats): number {
  return Math.max(1, Math.floor((attacker.attack * 100) / (100 + defender.defense)));
}

export function getAttackIntervalMs(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error(
      `전투 공격 주기 계산 실패: 속도 값 "${speed}"이 0보다 큰 유한수가 아닙니다. 전투원 스탯의 "speed"를 확인하세요.`,
    );
  }

  return Math.round((BASE_ATTACK_INTERVAL_MS * 100) / speed);
}

export function simulateBattle(pet: Combatant, enemy: Combatant): BattleSimulation {
  let petHp = pet.stats.maxHp;
  let enemyHp = enemy.stats.maxHp;
  let petNextAttackAt = getAttackIntervalMs(pet.stats.speed);
  let enemyNextAttackAt = getAttackIntervalMs(enemy.stats.speed);
  const actions: BattleAction[] = [];

  while (petHp > 0 && enemyHp > 0 && actions.length < MAX_BATTLE_ACTIONS) {
    const petActs = petNextAttackAt <= enemyNextAttackAt;

    if (petActs) {
      const damage = calculateDamage(pet.stats, enemy.stats);
      enemyHp = Math.max(0, enemyHp - damage);
      actions.push({ atMs: petNextAttackAt, actor: 'pet', damage, targetHp: enemyHp });
      petNextAttackAt += getAttackIntervalMs(pet.stats.speed);
    } else {
      const damage = calculateDamage(enemy.stats, pet.stats);
      petHp = Math.max(0, petHp - damage);
      actions.push({ atMs: enemyNextAttackAt, actor: 'enemy', damage, targetHp: petHp });
      enemyNextAttackAt += getAttackIntervalMs(enemy.stats.speed);
    }
  }

  const result: BattleResult = enemyHp <= 0 ? 'victory' : petHp <= 0 ? 'defeat' : 'draw';

  return {
    result,
    durationMs: actions.at(-1)?.atMs ?? 0,
    actions,
  };
}
