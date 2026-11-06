import { GAME_DATA } from '../data/game-data';
import { BATTLE_VICTORY_EXPERIENCE, GRASSLAND_STAGE_ID } from '../data/stages';
import type { BattleStageId, CombatStats, GameData, PetSpeciesId } from '../data/types';
import { isPetSpeciesId, type PetState } from '../pet/pet-state';

export { BATTLE_VICTORY_EXPERIENCE, GRASSLAND_STAGE_ID };
export type { BattleStageId, CombatStats };

export const BASE_ATTACK_INTERVAL_MS = GAME_DATA.battle.baseAttackIntervalMs;
export const MAX_BATTLE_ACTIONS = GAME_DATA.battle.maxActions;

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
  id: GAME_DATA.species.catalog.mudkip.id,
  name: GAME_DATA.species.catalog.mudkip.name,
  stats: GAME_DATA.species.catalog.mudkip.stats,
};

export const MARSHTOMP_COMBATANT: Combatant = {
  id: GAME_DATA.species.catalog.marshtomp.id,
  name: GAME_DATA.species.catalog.marshtomp.name,
  stats: GAME_DATA.species.catalog.marshtomp.stats,
};

export const SWAMPERT_COMBATANT: Combatant = {
  id: GAME_DATA.species.catalog.swampert.id,
  name: GAME_DATA.species.catalog.swampert.name,
  stats: GAME_DATA.species.catalog.swampert.stats,
};

export const SPECIES_COMBATANTS: Record<PetSpeciesId, Combatant> = {
  mudkip: MUDKIP_COMBATANT,
  marshtomp: MARSHTOMP_COMBATANT,
  swampert: SWAMPERT_COMBATANT,
};

export function createPetCombatant(
  pet: Pick<PetState, 'speciesId' | 'name'>,
  data: GameData = GAME_DATA,
): Combatant {
  if (!isPetSpeciesId(pet.speciesId, data)) {
    throw new Error(
      `전투원 생성 실패: 펫 종 "${String(pet.speciesId)}"을 찾지 못했습니다. "src/data/species.ts"의 "SPECIES_CATALOG" 설정을 확인하세요.`,
    );
  }

  const base = data.species.catalog[pet.speciesId];
  return {
    id: base.id,
    name: pet.name,
    stats: base.stats,
  };
}

export type BattleStage = {
  id: BattleStageId;
  name: string;
  enemy: Combatant;
  victoryExperience: number;
};

export const GRASSLAND_STAGE: BattleStage = {
  ...GAME_DATA.stages.catalog[GRASSLAND_STAGE_ID],
  enemy: MUDKIP_COMBATANT,
};

export function getBattleStage(stageId: string, data: GameData = GAME_DATA): BattleStage {
  const stage = data.stages.catalog[stageId as BattleStageId];

  if (!stage) {
    throw new Error(
      `전투 스테이지 조회 실패: 스테이지 "${stageId}"을 찾지 못했습니다. "src/data/stages.ts"의 "STAGES_CATALOG" 설정을 확인하세요.`,
    );
  }

  if (stage === GAME_DATA.stages.catalog[GRASSLAND_STAGE_ID]) {
    return GRASSLAND_STAGE;
  }

  return stage;
}

export function calculateDamage(attacker: CombatStats, defender: CombatStats): number {
  return Math.max(1, Math.floor((attacker.attack * 100) / (100 + defender.defense)));
}

export function getAttackIntervalMs(speed: number, data: GameData = GAME_DATA): number {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error(
      `전투 공격 주기 계산 실패: 속도 값 "${speed}"이 0보다 큰 유한수가 아닙니다. 전투원 스탯의 "speed"를 확인하세요.`,
    );
  }

  return Math.round((data.battle.baseAttackIntervalMs * 100) / speed);
}

export function simulateBattle(
  pet: Combatant,
  enemy: Combatant,
  data: GameData = GAME_DATA,
): BattleSimulation {
  let petHp = pet.stats.maxHp;
  let enemyHp = enemy.stats.maxHp;
  const petInterval = getAttackIntervalMs(pet.stats.speed, data);
  const enemyInterval = getAttackIntervalMs(enemy.stats.speed, data);
  let petNextAttackAt = petInterval;
  let enemyNextAttackAt = enemyInterval;
  const actions: BattleAction[] = [];

  while (petHp > 0 && enemyHp > 0 && actions.length < data.battle.maxActions) {
    const petActs = petNextAttackAt <= enemyNextAttackAt;

    if (petActs) {
      const damage = calculateDamage(pet.stats, enemy.stats);
      enemyHp = Math.max(0, enemyHp - damage);
      actions.push({ atMs: petNextAttackAt, actor: 'pet', damage, targetHp: enemyHp });
      petNextAttackAt += petInterval;
    } else {
      const damage = calculateDamage(enemy.stats, pet.stats);
      petHp = Math.max(0, petHp - damage);
      actions.push({ atMs: enemyNextAttackAt, actor: 'enemy', damage, targetHp: petHp });
      enemyNextAttackAt += enemyInterval;
    }
  }

  const result: BattleResult = enemyHp <= 0 ? 'victory' : petHp <= 0 ? 'defeat' : 'draw';

  return {
    result,
    durationMs: actions.at(-1)?.atMs ?? 0,
    actions,
  };
}
