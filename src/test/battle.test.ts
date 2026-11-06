import * as assert from 'node:assert/strict';
import {
  BASE_ATTACK_INTERVAL_MS,
  BATTLE_FIELD_IDS,
  BATTLE_STAGE_IDS,
  GRASSLAND_STAGE,
  MARSHTOMP_COMBATANT,
  MAX_BATTLE_ACTIONS,
  MUDKIP_COMBATANT,
  SWAMPERT_COMBATANT,
  calculateDamage,
  createPetCombatant,
  getAttackIntervalMs,
  getBattleFields,
  getBattleStage,
  getBattleStages,
  simulateBattle,
} from '../battle/battle';

suite('Battle', () => {
  test('초원 1 설정을 ID로 조회한다', () => {
    assert.strictEqual(getBattleStage('grassland-1'), GRASSLAND_STAGE);
    assert.strictEqual(GRASSLAND_STAGE.enemy.id, 'seedot');
    assert.strictEqual(GRASSLAND_STAGE.enemy.name, '도토링');
    assert.deepStrictEqual(GRASSLAND_STAGE.enemy.stats, MUDKIP_COMBATANT.stats);
    assert.strictEqual(GRASSLAND_STAGE.victoryExperience, 10);
  });

  test('5개 필드와 필드당 3개씩 총 15개 스테이지를 제공한다', () => {
    const fields = getBattleFields();
    const stages = getBattleStages();

    assert.strictEqual(fields.length, 5);
    assert.deepStrictEqual(
      fields.map((field) => field.id),
      [...BATTLE_FIELD_IDS],
    );
    assert.strictEqual(stages.length, 15);
    assert.deepStrictEqual(
      stages.map((stage) => stage.id),
      [...BATTLE_STAGE_IDS],
    );

    for (const field of fields) {
      assert.strictEqual(field.stageIds.length, 3);
      field.stageIds.forEach((stageId, index) => {
        const stage = getBattleStage(stageId);
        assert.strictEqual(stage.fieldId, field.id);
        assert.strictEqual(stage.stageNumber, index + 1);
      });
    }
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

  test('초원 1 도토링과 싸우면 선공한 물짱이가 승리한다', () => {
    const battle = simulateBattle(MUDKIP_COMBATANT, GRASSLAND_STAGE.enemy);

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

  test('필드 보스 수문장과 최종 보스 그란돈이 진화 단계별 밸런스에 맞게 동작한다', () => {
    const grassland3 = getBattleStage('grassland-3');
    const marsh3 = getBattleStage('marsh-3');
    const volcano3 = getBattleStage('volcano-3');

    assert.strictEqual(grassland3.enemy.name, '버섯모');
    assert.strictEqual(simulateBattle(MUDKIP_COMBATANT, grassland3.enemy).result, 'defeat');
    assert.strictEqual(simulateBattle(MARSHTOMP_COMBATANT, grassland3.enemy).result, 'victory');

    assert.strictEqual(marsh3.enemy.name, '메깅');
    assert.strictEqual(simulateBattle(MARSHTOMP_COMBATANT, marsh3.enemy).result, 'defeat');
    assert.strictEqual(simulateBattle(SWAMPERT_COMBATANT, marsh3.enemy).result, 'victory');

    assert.strictEqual(volcano3.enemy.id, 'groudon');
    assert.strictEqual(volcano3.enemy.name, '그란돈');
    const finalBattle = simulateBattle(SWAMPERT_COMBATANT, volcano3.enemy);
    assert.strictEqual(finalBattle.result, 'victory');
    assert.strictEqual(finalBattle.durationMs, 7_500);
    assert.strictEqual(finalBattle.actions.length, 5);
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

    const marshtompBattle = simulateBattle(marshtomp, GRASSLAND_STAGE.enemy);
    const swampertBattle = simulateBattle(swampert, GRASSLAND_STAGE.enemy);

    assert.strictEqual(marshtompBattle.result, 'victory');
    assert.ok(marshtompBattle.durationMs < 9_000);
    assert.strictEqual(swampertBattle.result, 'victory');
    assert.strictEqual(swampertBattle.actions.length, 1);
    assert.strictEqual(swampertBattle.durationMs, 2_500);
  });
});
