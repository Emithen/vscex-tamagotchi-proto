/**
 * globalState 읽기와 저장만 담당
 */

import * as vscode from 'vscode';
import { PetState, createInitialPetState } from './pet-state';

const PET_STATE_KEY = 'tamagotchi.petState';

export class PetStateStore {
  constructor(private readonly globalState: vscode.Memento) {}

  // 있으면 불러오고 없으면 초기화
  async load(): Promise<PetState> {
    const savedState = this.globalState.get<PetState>(PET_STATE_KEY);

    if (savedState) {
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
