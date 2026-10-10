import { createInitialPetState, setFullness, feedPet, type PetState } from './pet-state';
import { PetStateStore } from './pet-state-store';

export class PetService {
  constructor(private readonly store: PetStateStore) {}

  async getState(): Promise<PetState> {
    return this.store.load();
  }

  /**
   * 현재 상태 조회 > 다음 상태 계산 > 다음 상태 저장 > 저장한 상태 반환
   *
   * @returns 호출자에게 next state 를 반환
   */
  async feed(): Promise<PetState> {
    // current -> next state
    const currentState = await this.store.load();
    const nextState = feedPet(currentState);

    // update global store
    await this.store.save(nextState);

    // return next state
    return nextState;
  }

  async setFullness(fullness: number): Promise<PetState> {
    const currentState = await this.store.load();
    const nextState = setFullness(currentState, fullness);

    await this.store.save(nextState);

    return nextState;
  }

  async reset(): Promise<PetState> {
    const initialState = createInitialPetState();

    await this.store.save(initialState);

    return initialState;
  }
}
