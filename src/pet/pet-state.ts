import { GAME_DATA } from '../data/game-data';
import {
  DEFAULT_SPECIES_ID as DATA_DEFAULT_SPECIES_ID,
  DEV_MARSHTOMP_EVOLUTION_EXPERIENCE,
  DEV_MUDKIP_EVOLUTION_EXPERIENCE,
} from '../data/species';
import type { GameData, PetSpeciesId, SpeciesData } from '../data/types';

export type { PetSpeciesId };

export const DEFAULT_FULLNESS = GAME_DATA.care.defaultFullness;
export const MIN_FULLNESS = GAME_DATA.care.minFullness;
export const MAX_FULLNESS = GAME_DATA.care.maxFullness;
export const FULLNESS_DECAY_INTERVAL_MS = GAME_DATA.care.fullnessDecayIntervalMs;

export const DEFAULT_SPECIES_ID: PetSpeciesId = DATA_DEFAULT_SPECIES_ID;
export const MUDKIP_EVOLUTION_EXPERIENCE = DEV_MUDKIP_EVOLUTION_EXPERIENCE;
export const MARSHTOMP_EVOLUTION_EXPERIENCE = DEV_MARSHTOMP_EVOLUTION_EXPERIENCE;

export type PetSpecies = {
  id: PetSpeciesId;
  name: string;
  evolutionExperience?: number;
  nextSpeciesId?: PetSpeciesId;
};

function toPetSpecies(species: SpeciesData): PetSpecies {
  return {
    id: species.id,
    name: species.name,
    evolutionExperience: species.evolution?.requiredExperience,
    nextSpeciesId: species.evolution?.nextSpeciesId,
  };
}

export const PET_SPECIES: Record<PetSpeciesId, PetSpecies> = {
  mudkip: toPetSpecies(GAME_DATA.species.catalog.mudkip),
  marshtomp: toPetSpecies(GAME_DATA.species.catalog.marshtomp),
  swampert: toPetSpecies(GAME_DATA.species.catalog.swampert),
};

export type PetState = {
  speciesId: PetSpeciesId;
  name: string;
  fullness: number;
  experience: number;
  lastRewardedBattleId?: string;
  /** 다음 포만감 감소가 발생할 시각이다. */
  nextFullnessDecayAt: number;
};

export function isPetSpeciesId(value: unknown, data: GameData = GAME_DATA): value is PetSpeciesId {
  return typeof value === 'string' && value in data.species.catalog;
}

export function getPetSpecies(speciesId: string, data: GameData = GAME_DATA): PetSpecies {
  if (!isPetSpeciesId(speciesId, data)) {
    throw new Error(
      `Tamagotchi 종 조회 실패: 펫 종 "${speciesId}"을 찾지 못했습니다. "src/data/species.ts"의 "SPECIES_CATALOG" 설정을 확인하세요.`,
    );
  }

  return toPetSpecies(data.species.catalog[speciesId]);
}

export function getEvolutionExperience(
  speciesId: PetSpeciesId,
  data: GameData = GAME_DATA,
): number | undefined {
  return getPetSpecies(speciesId, data).evolutionExperience;
}

export function canEvolvePet(state: PetState, data: GameData = GAME_DATA): boolean {
  const species = getPetSpecies(state.speciesId, data);
  return (
    species.evolutionExperience !== undefined &&
    species.nextSpeciesId !== undefined &&
    state.experience >= species.evolutionExperience
  );
}

/**
 * 진화 조건을 충족한 펫을 다음 단계로 진화시킨다.
 *
 * 현재 이름이 종 기본 이름과 같으면 다음 종의 기본 이름으로 바꾸고,
 * 별명을 사용 중이면 이름을 유지한다. 최종 단계에 도달하면 경험치를 0으로 고정한다.
 */
export function evolvePet(state: PetState, data: GameData = GAME_DATA): PetState {
  const currentSpecies = getPetSpecies(state.speciesId, data);
  if (
    currentSpecies.evolutionExperience === undefined ||
    currentSpecies.nextSpeciesId === undefined ||
    state.experience < currentSpecies.evolutionExperience
  ) {
    return state;
  }

  const nextSpecies = getPetSpecies(currentSpecies.nextSpeciesId, data);
  const remainingExperience = state.experience - currentSpecies.evolutionExperience;

  return {
    ...state,
    speciesId: nextSpecies.id,
    name: state.name === currentSpecies.name ? nextSpecies.name : state.name,
    experience: nextSpecies.evolutionExperience === undefined ? 0 : remainingExperience,
  };
}

/**
 * 경험치를 추가하고 진화 요구량을 채운 경우 자동으로 다음 단계로 진화시킨다.
 */
export function addPetExperience(
  state: PetState,
  amount: number,
  data: GameData = GAME_DATA,
): PetState {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(
      `Tamagotchi 경험치 추가 실패: 경험치 값 "${amount}"이 0 이상의 정수가 아닙니다. 입력 값을 확인하세요.`,
    );
  }

  const currentSpecies = getPetSpecies(state.speciesId, data);
  if (currentSpecies.evolutionExperience === undefined || amount === 0) {
    return currentSpecies.evolutionExperience === undefined && state.experience !== 0
      ? { ...state, experience: 0 }
      : state;
  }

  let nextState: PetState = {
    ...state,
    experience: state.experience + amount,
  };

  while (canEvolvePet(nextState, data)) {
    nextState = evolvePet(nextState, data);
  }

  return nextState;
}

export function createInitialPetState(now = Date.now(), data: GameData = GAME_DATA): PetState {
  const defaultSpecies = data.species.catalog[data.species.defaultSpeciesId];
  return {
    speciesId: defaultSpecies.id,
    name: defaultSpecies.name,
    fullness: data.care.defaultFullness,
    experience: 0,
    nextFullnessDecayAt: now + data.care.fullnessDecayIntervalMs,
  };
}

export function clampFullness(fullness: number, data: GameData = GAME_DATA): number {
  return Math.min(data.care.maxFullness, Math.max(data.care.minFullness, fullness));
}

export function getFullnessDecayDelay(state: PetState, now = Date.now()): number {
  return Math.max(0, state.nextFullnessDecayAt - now);
}

/**
 * 현재 시각까지 예정된 포만감 감소를 한 번에 반영한다.
 *
 * 감소 예정 시각이 지나지 않았으면 기존 상태를 그대로 반환한다.
 * 여러 감소 주기가 지났으면 경과한 횟수만큼 반영하고, 다음 감소 시각을
 * 아직 소비하지 않은 최초의 예정 시각으로 이동한다.
 *
 * @param state 현재 펫 상태
 * @param now 계산 기준 시각. 생략하면 현재 시각을 사용한다.
 * @param data 적용할 게임 데이터셋
 * @returns 시간 경과를 반영한 펫 상태
 */
export function applyFullnessDecay(
  state: PetState,
  now = Date.now(),
  data: GameData = GAME_DATA,
): PetState {
  if (now < state.nextFullnessDecayAt) {
    return state;
  }

  const intervalMs = data.care.fullnessDecayIntervalMs;
  const elapsedSinceFirstDecay = now - state.nextFullnessDecayAt;
  const decayCount = Math.floor(elapsedSinceFirstDecay / intervalMs) + 1;

  return {
    ...state,
    fullness: clampFullness(state.fullness - decayCount, data),
    nextFullnessDecayAt: state.nextFullnessDecayAt + decayCount * intervalMs,
  };
}

/**
 * 펫의 포만감을 지정한 값으로 변경하고 다음 감소 시각을 재설정한다.
 *
 * 기존 상태 객체는 변경하지 않으며, 포만감은 유효 범위의 정수여야 한다.
 *
 * @param state 현재 펫 상태
 * @param fullness 새 포만감
 * @param now 설정 시각. 생략하면 현재 시각을 사용한다.
 * @param data 적용할 게임 데이터셋
 * @returns 포만감이 변경된 새로운 펫 상태
 */
export function setFullness(
  state: PetState,
  fullness: number,
  now = Date.now(),
  data: GameData = GAME_DATA,
): PetState {
  const { minFullness, maxFullness, fullnessDecayIntervalMs } = data.care;
  const isValidFullness =
    Number.isInteger(fullness) && fullness >= minFullness && fullness <= maxFullness;

  if (!isValidFullness) {
    throw new Error(
      `Tamagotchi 상태 업데이트 실패: 포만감 값 "${fullness}"은 ${minFullness}부터 ${maxFullness}까지의 정수여야 합니다. 입력 값을 확인하세요.`,
    );
  }

  return {
    ...state,
    fullness,
    nextFullnessDecayAt: now + fullnessDecayIntervalMs,
  };
}

/**
 * 펫에게 먹이를 주어 포만감을 증가시키고 다음 감소 시각을 재설정한다.
 *
 * 기존 상태 객체는 변경하지 않으며, 포만감은 최대치를 넘지 않는다.
 * 이미 최대 포만감이면 상태와 다음 감소 시각을 변경하지 않는다.
 *
 * @param state 현재 펫 상태
 * @param now 먹이를 준 시각. 생략하면 현재 시각을 사용한다.
 * @param data 적용할 게임 데이터셋
 * @returns 먹이를 준 이후의 새로운 펫 상태
 */
export function feedPet(state: PetState, now = Date.now(), data: GameData = GAME_DATA): PetState {
  const { maxFullness, feedAmount, fullnessDecayIntervalMs } = data.care;
  if (state.fullness >= maxFullness) {
    return state;
  }

  return {
    ...state,
    fullness: clampFullness(state.fullness + feedAmount, data),
    nextFullnessDecayAt: now + fullnessDecayIntervalMs,
  };
}
