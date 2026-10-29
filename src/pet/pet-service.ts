import {
  applyFullnessDecay,
  createInitialPetState,
  setFullness,
  feedPet,
  type PetState,
} from './pet-state';
import { PetStateStore } from './pet-state-store';

type PetStateStorage = Pick<PetStateStore, 'load' | 'save'>;

export class PetService {
  constructor(
    private readonly store: PetStateStorage,
    private readonly now: () => number = Date.now,
  ) {}

  async getState(): Promise<PetState> {
    const storedState = await this.store.load();
    const currentState = applyFullnessDecay(storedState, this.now());

    if (currentState !== storedState) {
      await this.store.save(currentState);
    }

    return currentState;
  }

  /**
   * 현재 상태 조회 > 다음 상태 계산 > 다음 상태 저장 > 저장한 상태 반환
   *
   * @returns 호출자에게 next state 를 반환
   */
  async feed(): Promise<PetState> {
    const now = this.now();
    const storedState = await this.store.load();
    const currentState = applyFullnessDecay(storedState, now);
    const nextState = feedPet(currentState, now);

    if (nextState !== storedState) {
      await this.store.save(nextState);
    }

    return nextState;
  }

  async setFullness(fullness: number): Promise<PetState> {
    const currentState = await this.store.load();
    const nextState = setFullness(currentState, fullness, this.now());

    await this.store.save(nextState);

    return nextState;
  }

  async addBattleExperience(battleId: string, amount: number): Promise<PetState> {
    const currentState = await this.getState();

    if (currentState.lastRewardedBattleId === battleId) {
      return currentState;
    }

    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error(
        `Tamagotchi 전투 보상 적용 실패: 경험치 "${amount}"이 0 이상의 정수가 아닙니다. 전투 "${battleId}"의 보상 설정을 확인하세요.`,
      );
    }

    const nextState = {
      ...currentState,
      experience: currentState.experience + amount,
      lastRewardedBattleId: battleId,
    };

    await this.store.save(nextState);
    return nextState;
  }

  async reset(): Promise<PetState> {
    const initialState = createInitialPetState(this.now());

    await this.store.save(initialState);

    return initialState;
  }
}
