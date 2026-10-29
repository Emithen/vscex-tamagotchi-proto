import * as assert from 'node:assert/strict';
import type * as vscode from 'vscode';
import { PetStateStore } from '../pet/pet-state-store';
import { DEFAULT_FULLNESS, FULLNESS_DECAY_INTERVAL_MS } from '../pet/pet-state';

const PET_STATE_KEY = 'tamagotchi.petState';

class TestMemento implements vscode.Memento {
  private readonly values = new Map<string, unknown>();

  constructor(initialValues: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(initialValues)) {
      this.values.set(key, value);
    }
  }

  keys(): readonly string[] {
    return [...this.values.keys()];
  }

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.values.get(key);

    return value === undefined ? defaultValue : (value as T);
  }

  async update(key: string, value: unknown): Promise<void> {
    if (value === undefined) {
      this.values.delete(key);
      return;
    }

    this.values.set(key, value);
  }
}

suite('Pet State Store', () => {
  test('현재 스키마와 맞지 않는 저장 상태를 초기화한다', async () => {
    const memento = new TestMemento({
      [PET_STATE_KEY]: {
        name: '이전 펫',
        fullness: 7,
      },
    });
    const store = new PetStateStore(memento);
    const before = Date.now();

    const state = await store.load();
    const after = Date.now();

    assert.strictEqual(state.name, '물짱이');
    assert.strictEqual(state.fullness, DEFAULT_FULLNESS);
    assert.strictEqual(state.experience, 0);
    assert.ok(state.nextFullnessDecayAt >= before + FULLNESS_DECAY_INTERVAL_MS);
    assert.ok(state.nextFullnessDecayAt <= after + FULLNESS_DECAY_INTERVAL_MS);
    assert.deepStrictEqual(memento.get(PET_STATE_KEY), state);
  });
});
