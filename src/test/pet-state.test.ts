import * as assert from 'node:assert/strict';
import {
  DEFAULT_FULLNESS,
  FULLNESS_DECAY_INTERVAL_MS,
  MAX_FULLNESS,
  applyFullnessDecay,
  createInitialPetState,
  getFullnessDecayDelay,
  setFullness,
  feedPet,
  type PetState,
} from '../pet/pet-state';

function createState(overrides: Partial<PetState> = {}): PetState {
  return {
    name: '물짱이',
    fullness: DEFAULT_FULLNESS,
    experience: 0,
    nextFullnessDecayAt: FULLNESS_DECAY_INTERVAL_MS,
    ...overrides,
  };
}

suite('Pet State', () => {
  test('초기 상태를 생성한다', () => {
    const state = createInitialPetState(1_000);

    assert.strictEqual(state.name, '물짱이');
    assert.strictEqual(state.fullness, DEFAULT_FULLNESS);
    assert.strictEqual(state.experience, 0);
    assert.strictEqual(state.nextFullnessDecayAt, 1_000 + FULLNESS_DECAY_INTERVAL_MS);
  });

  test('다음 포만감 감소까지 남은 시간을 계산한다', () => {
    const state = createState();

    const delay = getFullnessDecayDelay(state, FULLNESS_DECAY_INTERVAL_MS / 2);

    assert.strictEqual(delay, FULLNESS_DECAY_INTERVAL_MS / 2);
  });

  test('감소 시각이 지났으면 대기 시간을 0으로 제한한다', () => {
    const state = createState();

    const delay = getFullnessDecayDelay(state, FULLNESS_DECAY_INTERVAL_MS * 2);

    assert.strictEqual(delay, 0);
  });

  test('다음 감소 시각 전에는 포만감을 변경하지 않는다', () => {
    const state = createState();

    const nextState = applyFullnessDecay(state, FULLNESS_DECAY_INTERVAL_MS - 1);

    assert.strictEqual(nextState, state);
  });

  test('다음 감소 시각에 포만감을 1 감소시킨다', () => {
    const state = createState({ fullness: 5 });

    const nextState = applyFullnessDecay(state, FULLNESS_DECAY_INTERVAL_MS);

    assert.strictEqual(nextState.fullness, 4);
    assert.strictEqual(nextState.nextFullnessDecayAt, FULLNESS_DECAY_INTERVAL_MS * 2);
  });

  test('여러 감소 주기와 남은 시간을 한 번에 반영한다', () => {
    const state = createState({ fullness: 5 });
    const now = FULLNESS_DECAY_INTERVAL_MS * 3.5;

    const nextState = applyFullnessDecay(state, now);

    assert.strictEqual(nextState.fullness, 2);
    assert.strictEqual(nextState.nextFullnessDecayAt, FULLNESS_DECAY_INTERVAL_MS * 4);
  });

  test('포만감이 0 아래로 감소하지 않는다', () => {
    const state = createState({ fullness: 2 });

    const nextState = applyFullnessDecay(state, FULLNESS_DECAY_INTERVAL_MS * 5);

    assert.strictEqual(nextState.fullness, 0);
    assert.strictEqual(nextState.nextFullnessDecayAt, FULLNESS_DECAY_INTERVAL_MS * 6);
  });

  test('포만감이 0이어도 지난 감소 주기를 소비한다', () => {
    const state = createState({ fullness: 0 });

    const nextState = applyFullnessDecay(state, FULLNESS_DECAY_INTERVAL_MS * 3);

    assert.strictEqual(nextState.fullness, 0);
    assert.strictEqual(nextState.nextFullnessDecayAt, FULLNESS_DECAY_INTERVAL_MS * 4);
  });

  test('포만감을 감소시킬 때 기존 상태를 변경하지 않는다', () => {
    const state = createState({ fullness: 5 });
    const originalState = { ...state };

    const nextState = applyFullnessDecay(state, FULLNESS_DECAY_INTERVAL_MS);

    assert.deepStrictEqual(state, originalState);
    assert.notStrictEqual(nextState, state);
  });

  test('먹이를 주면 포만감이 1 증가한다', () => {
    const state = createState({ fullness: 5 });

    const nextState = feedPet(state, 2_000);

    assert.strictEqual(nextState.fullness, 6);
  });

  test('포만감이 최댓값을 넘지 않는다', () => {
    const state = createState({
      fullness: MAX_FULLNESS,
      nextFullnessDecayAt: 3_000,
    });

    const nextState = feedPet(state, 2_000);

    assert.strictEqual(nextState.fullness, MAX_FULLNESS);
    assert.strictEqual(nextState.nextFullnessDecayAt, 3_000);
  });

  test('기존 상태 객체를 변경하지 않는다', () => {
    const state = createState({ fullness: 5 });
    const originalState = { ...state };

    const nextState = feedPet(state, 2_000);

    assert.deepStrictEqual(state, originalState);
    assert.notStrictEqual(nextState, state);
  });

  test('먹이를 주면 다음 감소 시각을 재설정한다', () => {
    const state = createState();

    const nextState = feedPet(state, 2_000);

    assert.strictEqual(nextState.nextFullnessDecayAt, 2_000 + FULLNESS_DECAY_INTERVAL_MS);
  });

  test('포만감을 지정한 값으로 변경한다', () => {
    const state = createState({ fullness: 5 });

    const nextState = setFullness(state, 7, 2_000);

    assert.strictEqual(nextState.fullness, 7);
    assert.strictEqual(nextState.nextFullnessDecayAt, 2_000 + FULLNESS_DECAY_INTERVAL_MS);
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
