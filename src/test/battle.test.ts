import * as assert from 'node:assert/strict';
import {
  BASE_ATTACK_INTERVAL_MS,
  MAX_BATTLE_ACTIONS,
  MUDKIP_COMBATANT,
  calculateDamage,
  getAttackIntervalMs,
  simulateBattle,
} from '../battle/battle';

suite('Battle', () => {
  test('공격력과 방어력으로 데미지를 계산한다', () => {
    assert.strictEqual(calculateDamage(MUDKIP_COMBATANT.stats, MUDKIP_COMBATANT.stats), 16);
  });

  test('속도 100의 공격 주기는 기본 주기와 같다', () => {
    assert.strictEqual(getAttackIntervalMs(100), BASE_ATTACK_INTERVAL_MS);
  });

  test('동일한 물짱이끼리 싸우면 선공한 내 펫이 승리한다', () => {
    const battle = simulateBattle(MUDKIP_COMBATANT, MUDKIP_COMBATANT);

    assert.strictEqual(battle.result, 'victory');
    assert.strictEqual(battle.durationMs, 24_000);
    assert.strictEqual(battle.actions.length, 15);
    assert.deepStrictEqual(battle.actions.at(-1), {
      atMs: 24_000,
      actor: 'pet',
      damage: 16,
      targetHp: 0,
    });
  });

  test('전투 행동 수를 안전 상한 이하로 제한한다', () => {
    const durableCombatant = {
      ...MUDKIP_COMBATANT,
      stats: { ...MUDKIP_COMBATANT.stats, maxHp: 10_000_000, attack: 1, defense: 10_000_000 },
    };
    const battle = simulateBattle(durableCombatant, durableCombatant);

    assert.strictEqual(battle.result, 'draw');
    assert.strictEqual(battle.actions.length, MAX_BATTLE_ACTIONS);
  });
});
