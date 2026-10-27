import * as assert from 'node:assert/strict';
import { PetService } from '../pet/pet-service';
import { FULLNESS_DECAY_INTERVAL_MS, MAX_FULLNESS, type PetState } from '../pet/pet-state';

class TestPetStateStore {
  saveCount = 0;

  constructor(public state: PetState) {}

  async load(): Promise<PetState> {
    return this.state;
  }

  async save(state: PetState): Promise<void> {
    this.state = state;
    this.saveCount += 1;
  }
}

function createState(overrides: Partial<PetState> = {}): PetState {
  return {
    name: '물짱이',
    fullness: 5,
    nextFullnessDecayAt: FULLNESS_DECAY_INTERVAL_MS,
    ...overrides,
  };
}

suite('Pet Service', () => {
  test('조회 시 감소 시각 전이면 저장하지 않는다', async () => {
    const storedState = createState();
    const store = new TestPetStateStore(storedState);
    const service = new PetService(store, () => FULLNESS_DECAY_INTERVAL_MS - 1);

    const state = await service.getState();

    assert.strictEqual(state, storedState);
    assert.strictEqual(store.saveCount, 0);
  });

  test('조회 시 지난 감소 주기를 반영하고 저장한다', async () => {
    const store = new TestPetStateStore(createState());
    const service = new PetService(store, () => FULLNESS_DECAY_INTERVAL_MS * 2);

    const state = await service.getState();

    assert.strictEqual(state.fullness, 3);
    assert.strictEqual(state.nextFullnessDecayAt, FULLNESS_DECAY_INTERVAL_MS * 3);
    assert.strictEqual(store.state, state);
    assert.strictEqual(store.saveCount, 1);
  });

  test('먹이를 주기 전에 지난 감소 주기를 반영한다', async () => {
    const store = new TestPetStateStore(createState());
    const service = new PetService(store, () => FULLNESS_DECAY_INTERVAL_MS * 2);

    const state = await service.feed();

    assert.strictEqual(state.fullness, 4);
    assert.strictEqual(state.nextFullnessDecayAt, FULLNESS_DECAY_INTERVAL_MS * 3);
    assert.strictEqual(store.state, state);
    assert.strictEqual(store.saveCount, 1);
  });

  test('감소 전 최대 포만감이면 먹이를 저장하지 않는다', async () => {
    const storedState = createState({
      fullness: MAX_FULLNESS,
      nextFullnessDecayAt: FULLNESS_DECAY_INTERVAL_MS * 2,
    });
    const store = new TestPetStateStore(storedState);
    const service = new PetService(store, () => FULLNESS_DECAY_INTERVAL_MS);

    const state = await service.feed();

    assert.strictEqual(state, storedState);
    assert.strictEqual(store.saveCount, 0);
  });
});
