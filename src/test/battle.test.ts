import * as assert from 'node:assert/strict';
import {
  BASE_ATTACK_INTERVAL_MS,
  GRASSLAND_STAGE,
  MARSHTOMP_COMBATANT,
  MAX_BATTLE_ACTIONS,
  MUDKIP_COMBATANT,
  SWAMPERT_COMBATANT,
  calculateDamage,
  createPetCombatant,
  getBattleStage,
  getAttackIntervalMs,
  simulateBattle,
} from '../battle/battle';

suite('Battle', () => {
  test('초원 1 설정을 ID로 조회한다', () => {
    assert.strictEqual(getBattleStage('grassland-1'), GRASSLAND_STAGE);
    assert.strictEqual(GRASSLAND_STAGE.enemy, MUDKIP_COMBATANT);
    assert.strictEqual(GRASSLAND_STAGE.victoryExperience, 10);
  });

  test('등록되지 않은 스테이지를 거부한다', () => {
    assert.throws(() => getBattleStage('unknown-stage'), /unknown-stage.*찾지 못했습니다/);
  });

  test('공격력과 방어력으로 데미지를 계산한다', () => {
    assert.strictEqual(calculateDamage(MUDKIP_COMBATANT.stats, MUDKIP_COMBATANT.stats), 9);
  });

  test('속도 100의 공격 주기는 기본 주기와 같다', () => {
    assert.strictEqual(getAttackIntervalMs(100), BASE_ATTACK_INTERVAL_MS);
  });

  test('동일한 물짱이끼리 싸우면 선공한 내 펫이 승리한다', () => {
    const battle = simulateBattle(MUDKIP_COMBATANT, MUDKIP_COMBATANT);

    assert.strictEqual(battle.result, 'victory');
    assert.strictEqual(battle.durationMs, 9_000);
    assert.strictEqual(battle.actions.length, 5);
    assert.deepStrictEqual(battle.actions.at(-1), {
      atMs: 9_000,
      actor: 'pet',
      damage: 9,
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

  test('진화 단계별 스탯으로 전투원을 생성하고 더 빠르게 승리한다', () => {
    const marshtomp = createPetCombatant({ speciesId: 'marshtomp', name: '늪짱이' });
    const swampert = createPetCombatant({ speciesId: 'swampert', name: '대짱이' });

    assert.deepStrictEqual(marshtomp.stats, MARSHTOMP_COMBATANT.stats);
    assert.deepStrictEqual(swampert.stats, SWAMPERT_COMBATANT.stats);

    const marshtompBattle = simulateBattle(marshtomp, MUDKIP_COMBATANT);
    const swampertBattle = simulateBattle(swampert, MUDKIP_COMBATANT);

    assert.strictEqual(marshtompBattle.result, 'victory');
    assert.ok(marshtompBattle.durationMs < 9_000);
    assert.strictEqual(swampertBattle.result, 'victory');
    assert.strictEqual(swampertBattle.actions.length, 1);
    assert.strictEqual(swampertBattle.durationMs, 2_500);
  });
});
