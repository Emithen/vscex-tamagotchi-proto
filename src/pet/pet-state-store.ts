/**
 * globalState 읽기와 저장만 담당
 */

import * as vscode from 'vscode';
import { MAX_FULLNESS, MIN_FULLNESS, PetState, createInitialPetState } from './pet-state';

const PET_STATE_KEY = 'tamagotchi.petState';

export class PetStateStore {
  constructor(private readonly globalState: vscode.Memento) {}

  // 있으면 불러오고 없으면 초기화
  async load(): Promise<PetState> {
    const savedState = this.globalState.get<unknown>(PET_STATE_KEY);

    if (isPetState(savedState)) {
      return savedState;
    }

    const initialState = createInitialPetState();
    await this.save(initialState);

    return initialState;
  }

  async save(petState: PetState): Promise<void> {
    await this.globalState.update(PET_STATE_KEY, petState);
  }
}

function isPetState(value: unknown): value is PetState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const state = value as Partial<PetState>;

  return (
    typeof state.name === 'string' &&
    Number.isInteger(state.fullness) &&
    state.fullness !== undefined &&
    state.fullness >= MIN_FULLNESS &&
    state.fullness <= MAX_FULLNESS &&
    Number.isInteger(state.experience) &&
    state.experience !== undefined &&
    state.experience >= 0 &&
    (state.lastRewardedBattleId === undefined || typeof state.lastRewardedBattleId === 'string') &&
    typeof state.nextFullnessDecayAt === 'number' &&
    Number.isFinite(state.nextFullnessDecayAt)
  );
}
