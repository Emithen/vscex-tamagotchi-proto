import * as assert from 'node:assert/strict';
import {
  DEFAULT_FULLNESS,
  MAX_FULLNESS,
  createInitialPetState,
  setFullness,
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

  test('포만감을 지정한 값으로 변경한다', () => {
    const state = createState({ fullness: 5 });

    const nextState = setFullness(state, 7, 2_000);

    assert.strictEqual(nextState.fullness, 7);
    assert.strictEqual(nextState.updatedAt, 2_000);
  });

  test('포만감 경계값을 허용한다', () => {
    const state = createState();

    assert.strictEqual(setFullness(state, 0, 2_000).fullness, 0);
    assert.strictEqual(setFullness(state, MAX_FULLNESS, 2_000).fullness, MAX_FULLNESS);
  });

  test('유효하지 않은 포만감을 거부한다', () => {
    const state = createState();

    for (const fullness of [-1, MAX_FULLNESS + 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(
        () => setFullness(state, fullness, 2_000),
        /포만감 값 .*은 0부터 10까지의 정수여야 합니다/,
      );
    }
  });

  test('포만감을 설정할 때 기존 상태를 변경하지 않는다', () => {
    const state = createState({ fullness: 5 });
    const originalState = { ...state };

    const nextState = setFullness(state, 7, 2_000);

    assert.deepStrictEqual(state, originalState);
    assert.notStrictEqual(nextState, state);
  });
});
