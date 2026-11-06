import * as assert from 'node:assert/strict';
import { DEV_TEST_GAME_DATA, PRODUCTION_GAME_DATA, getGameDataForMode } from '../data/game-data';
import { getGameScenario } from '../data/scenarios';
import {
  PROD_MARSHTOMP_EVOLUTION_EXPERIENCE,
  PROD_MUDKIP_EVOLUTION_EXPERIENCE,
} from '../data/species';
import { addPetExperience, createInitialPetState, getEvolutionExperience } from '../pet/pet-state';

suite('Game Data & Scenarios', () => {
  test('실행 모드에 따라 개발·테스트용과 프로덕션 데이터셋을 구분한다', () => {
    assert.strictEqual(getGameDataForMode('development'), DEV_TEST_GAME_DATA);
    assert.strictEqual(getGameDataForMode('test'), DEV_TEST_GAME_DATA);
    assert.strictEqual(getGameDataForMode('production'), PRODUCTION_GAME_DATA);
  });

  test('프로덕션 데이터셋 주입 시 프로덕션 진화 요구 경험치를 적용한다', () => {
    const initial = createInitialPetState(1_000, PRODUCTION_GAME_DATA);

    assert.strictEqual(
      getEvolutionExperience('mudkip', PRODUCTION_GAME_DATA),
      PROD_MUDKIP_EVOLUTION_EXPERIENCE,
    );
    assert.strictEqual(
      getEvolutionExperience('marshtomp', PRODUCTION_GAME_DATA),
      PROD_MARSHTOMP_EVOLUTION_EXPERIENCE,
    );

    const afterOneWin = addPetExperience(initial, 10, PRODUCTION_GAME_DATA);
    assert.strictEqual(afterOneWin.speciesId, 'mudkip');
    assert.strictEqual(afterOneWin.experience, 10);

    const evolved = addPetExperience(
      afterOneWin,
      PROD_MUDKIP_EVOLUTION_EXPERIENCE - 10,
      PRODUCTION_GAME_DATA,
    );
    assert.strictEqual(evolved.speciesId, 'marshtomp');
    assert.strictEqual(evolved.name, '늪짱이');
    assert.strictEqual(evolved.experience, 0);
  });

  test('시나리오 프리셋으로 원하는 초기 상태를 생성한다', () => {
    const nearEvolution = getGameScenario('marshtomp-near-evolution').createInitialState(2_000);
    assert.strictEqual(nearEvolution.pet.speciesId, 'marshtomp');
    assert.strictEqual(nearEvolution.pet.experience, 10);

    const evolved = addPetExperience(nearEvolution.pet, 10, DEV_TEST_GAME_DATA);
    assert.strictEqual(evolved.speciesId, 'swampert');
    assert.strictEqual(evolved.name, '대짱이');
  });

  test('등록되지 않은 시나리오 ID를 거부한다', () => {
    assert.throws(
      () => getGameScenario('unknown-scenario'),
      /시나리오 "unknown-scenario"을 찾지 못했습니다/,
    );
  });
});
