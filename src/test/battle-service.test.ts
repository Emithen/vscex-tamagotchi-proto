import * as assert from 'node:assert/strict';
import { BattleService } from '../battle/battle-service';
import type { BattleRecord } from '../battle/battle';
import { PetService } from '../pet/pet-service';
import type { PetState } from '../pet/pet-state';

class TestBattleStore {
  battle?: BattleRecord;

  load(): BattleRecord | undefined {
    return this.battle;
  }

  async save(battle: BattleRecord | undefined): Promise<void> {
    this.battle = battle;
  }
}

class TestPetStore {
  state: PetState = {
    name: '물짱이',
    fullness: 5,
    experience: 0,
    nextFullnessDecayAt: 1_000_000,
  };

  async load(): Promise<PetState> {
    return this.state;
  }

  async save(state: PetState): Promise<void> {
    this.state = state;
  }
}

suite('Battle Service', () => {
  test('등록되지 않은 스테이지로 전투를 시작하지 않는다', async () => {
    const battleStore = new TestBattleStore();
    const petService = new PetService(new TestPetStore(), () => 1_000);
    const service = new BattleService(
      battleStore,
      petService,
      () => 1_000,
      () => 'battle-1',
    );

    await assert.rejects(() => service.startBattle('unknown-stage'), /unknown-stage/);
    assert.strictEqual(battleStore.battle, undefined);
  });

  test('초원 1 전투를 생성하고 완료 전에는 보상을 거부한다', async () => {
    const battleStore = new TestBattleStore();
    const petStore = new TestPetStore();
    const petService = new PetService(petStore, () => 1_000);
    const service = new BattleService(
      battleStore,
      petService,
      () => 1_000,
      () => 'battle-1',
    );

    const battle = await service.startBattle();

    assert.strictEqual(battle.id, 'battle-1');
    assert.strictEqual(battle.result, 'victory');
    assert.strictEqual(battle.experienceReward, 10);
    await assert.rejects(() => service.claimReward(), /battle-1.*아직 진행 중/);
  });

  test('완료된 전투 보상을 한 번만 적용한다', async () => {
    let now = 1_000;
    const battleStore = new TestBattleStore();
    const petStore = new TestPetStore();
    const petService = new PetService(petStore, () => now);
    const service = new BattleService(
      battleStore,
      petService,
      () => now,
      () => 'battle-1',
    );
    const battle = await service.startBattle();
    now = battle.startedAt + battle.durationMs;

    await service.claimReward();
    await service.claimReward();

    assert.strictEqual(petStore.state.experience, 10);
    assert.strictEqual(battleStore.battle?.rewardClaimed, true);
    assert.strictEqual(service.getBattle(), undefined);
  });
});
