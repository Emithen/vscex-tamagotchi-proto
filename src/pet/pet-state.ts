export const DEFAULT_FULLNESS = 5;
export const MIN_FULLNESS = 0;
export const MAX_FULLNESS = 10;
export const FULLNESS_DECAY_INTERVAL_MS = 60 * 60 * 1_000;

export type PetState = {
  name: string;
  fullness: number;
  /** 다음 포만감 감소가 발생할 시각이다. */
  nextFullnessDecayAt: number;
};

export function createInitialPetState(now = Date.now()): PetState {
  return {
    name: '물짱이',
    fullness: DEFAULT_FULLNESS,
    nextFullnessDecayAt: now + FULLNESS_DECAY_INTERVAL_MS,
  };
}

export function clampFullness(fullness: number): number {
  return Math.min(MAX_FULLNESS, Math.max(MIN_FULLNESS, fullness));
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
 * @returns 시간 경과를 반영한 펫 상태
 */
export function applyFullnessDecay(state: PetState, now = Date.now()): PetState {
  if (now < state.nextFullnessDecayAt) {
    return state;
  }

  const elapsedSinceFirstDecay = now - state.nextFullnessDecayAt;
  const decayCount = Math.floor(elapsedSinceFirstDecay / FULLNESS_DECAY_INTERVAL_MS) + 1;

  return {
    ...state,
    fullness: clampFullness(state.fullness - decayCount),
    nextFullnessDecayAt: state.nextFullnessDecayAt + decayCount * FULLNESS_DECAY_INTERVAL_MS,
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
 * @returns 포만감이 변경된 새로운 펫 상태
 */
export function setFullness(state: PetState, fullness: number, now = Date.now()): PetState {
  const isValidFullness =
    Number.isInteger(fullness) && fullness >= MIN_FULLNESS && fullness <= MAX_FULLNESS;

  if (!isValidFullness) {
    throw new Error(
      `Tamagotchi 상태 업데이트 실패: 포만감 값 "${fullness}"은 ${MIN_FULLNESS}부터 ${MAX_FULLNESS}까지의 정수여야 합니다. 입력 값을 확인하세요.`,
    );
  }

  return {
    ...state,
    fullness,
    nextFullnessDecayAt: now + FULLNESS_DECAY_INTERVAL_MS,
  };
}

/**
 * 펫에게 먹이를 주어 포만감을 1 증가시키고 다음 감소 시각을 재설정한다.
 *
 * 기존 상태 객체는 변경하지 않으며, 포만감은 최대치를 넘지 않는다.
 * 이미 최대 포만감이면 상태와 다음 감소 시각을 변경하지 않는다.
 *
 * @param state 현재 펫 상태
 * @param now 먹이를 준 시각. 생략하면 현재 시각을 사용한다.
 * @returns 먹이를 준 이후의 새로운 펫 상태
 */
export function feedPet(state: PetState, now = Date.now()): PetState {
  if (state.fullness >= MAX_FULLNESS) {
    return state;
  }

  return {
    ...state,
    fullness: clampFullness(state.fullness + 1),
    nextFullnessDecayAt: now + FULLNESS_DECAY_INTERVAL_MS,
  };
}
