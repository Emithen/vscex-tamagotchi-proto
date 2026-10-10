import * as assert from 'node:assert/strict';
import {
  DEFAULT_FULLNESS,
  MAX_FULLNESS,
  createInitialPetState,
  feedPet,
  type PetState,
} from '../pet/pet-state';

function createState(overrides: Partial<PetState> = {}): PetState {
  return {
    name: '물짱이',
    fullness: DEFAULT_FULLNESS,
    updatedAt: 1_000,
    ...overrides,
  };
}

suite('Pet State', () => {
  test('초기 상태를 생성한다', () => {
    const before = Date.now();
    const state = createInitialPetState();
    const after = Date.now();

    assert.strictEqual(state.name, '물짱이');
    assert.strictEqual(state.fullness, DEFAULT_FULLNESS);
    assert.ok(state.updatedAt >= before);
    assert.ok(state.updatedAt <= after);
  });

  test('먹이를 주면 포만감이 1 증가한다', () => {
    const state = createState({ fullness: 5 });

    const nextState = feedPet(state, 2_000);

    assert.strictEqual(nextState.fullness, 6);
  });

  test('포만감이 최댓값을 넘지 않는다', () => {
    const state = createState({ fullness: MAX_FULLNESS });

    const nextState = feedPet(state, 2_000);

    assert.strictEqual(nextState.fullness, MAX_FULLNESS);
  });

  test('기존 상태 객체를 변경하지 않는다', () => {
    const state = createState({ fullness: 5 });
    const originalState = { ...state };

    const nextState = feedPet(state, 2_000);

    assert.deepStrictEqual(state, originalState);
    assert.notStrictEqual(nextState, state);
  });

  test('전달한 갱신 시각을 기록한다', () => {
    const state = createState();

    const nextState = feedPet(state, 2_000);

    assert.strictEqual(nextState.updatedAt, 2_000);
  });
});
