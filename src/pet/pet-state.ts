export const DEFAULT_FULLNESS = 5;
export const MIN_FULLNESS = 0;
export const MAX_FULLNESS = 10;

export type PetState = {
	name: string;
	fullness: number;
	updatedAt: number;
};

export function createInitialPetState(): PetState {
	return {
		name: '물짱이',
		fullness: DEFAULT_FULLNESS,
		updatedAt: Date.now(),
	};
}

export function clampFullness(fullness: number): number {
    return Math.min(MAX_FULLNESS, Math.max(MIN_FULLNESS, fullness));
}

/**
 * 펫에게 먹이를 주어 포만감을 1 증가시키고 갱신 시각을 기록한다.
 *
 * 기존 상태 객체는 변경하지 않으며, 포만감은 최대치를 넘지 않는다.
 *
 * @param state 현재 펫 상태
 * @param now 갱신 시각. 생략하면 현재 시각을 사용한다.
 * @returns 먹이를 준 이후의 새로운 펫 상태
 */
export function feedPet(
    state: PetState,
    now = Date.now(),
): PetState {
    return {
        ...state,
        fullness: clampFullness(state.fullness + 1),
        updatedAt: now,
    };
}
