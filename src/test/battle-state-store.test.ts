import * as assert from 'node:assert/strict';
import type * as vscode from 'vscode';
import { BattleStateStore } from '../battle/battle-state-store';
import {
  GRASSLAND_STAGE,
  MUDKIP_COMBATANT,
  simulateBattle,
  type BattleRecord,
} from '../battle/battle';

const BATTLE_STATE_KEY = 'tamagotchi.battleState';

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

function createBattle(): BattleRecord {
  return {
    ...simulateBattle(MUDKIP_COMBATANT, GRASSLAND_STAGE.enemy),
    id: 'battle-1',
    stageId: GRASSLAND_STAGE.id,
    startedAt: 1_000,
    pet: MUDKIP_COMBATANT,
    enemy: GRASSLAND_STAGE.enemy,
    experienceReward: GRASSLAND_STAGE.victoryExperience,
    rewardClaimed: false,
  };
}

suite('Battle State Store', () => {
  test('현재 스키마의 전투 상태를 불러온다', () => {
    const battle = createBattle();
    const store = new BattleStateStore(new TestMemento({ [BATTLE_STATE_KEY]: battle }));

    assert.deepStrictEqual(store.load(), battle);
  });

  test('스키마와 맞지 않는 전투 상태를 무시한다', () => {
    const invalidBattle = { ...createBattle(), stageId: 'unknown-stage' };
    const store = new BattleStateStore(new TestMemento({ [BATTLE_STATE_KEY]: invalidBattle }));

    assert.strictEqual(store.load(), undefined);
  });

  test('전투 상태를 저장하고 삭제한다', async () => {
    const memento = new TestMemento();
    const store = new BattleStateStore(memento);
    const battle = createBattle();

    await store.save(battle);
    assert.deepStrictEqual(store.load(), battle);

    await store.save(undefined);
    assert.strictEqual(store.load(), undefined);
  });
});
