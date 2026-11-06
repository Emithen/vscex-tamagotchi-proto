import {
  getBattleFields,
  getBattleStage,
  getBattleStages,
  type BattleRecord,
  type BattleStage,
  type FieldData,
} from '../battle/battle';
import { GAME_DATA } from '../data/game-data';
import type { GameData } from '../data/types';
import type { PetState } from '../pet/pet-state';

/** 전투 종료 후 결과 화면을 보여주기까지 기다리는 시간이다. */
export const BATTLE_RESULT_REVEAL_DELAY_MS = GAME_DATA.battle.resultRevealDelayMs;

/** Extension Host가 Webview에 보내는 화면 상태이다. */
export type ViewSnapshot = {
  pet: PetState;
  /** 기본 선택 스테이지 */
  stage: BattleStage;
  /** 선택 가능한 전체 필드 목록 (5필드) */
  fields: FieldData[];
  /** 선택 가능한 전체 스테이지 목록 (15스테이지) */
  stages: BattleStage[];
  battle?: {
    record: BattleRecord;
    stage: BattleStage;
  };
};

export type HostMessage = { type: 'snapshot'; snapshot: ViewSnapshot };

export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'feed' }
  | { type: 'startBattle'; stageId: string }
  | { type: 'claimBattleReward' }
  | { type: 'battleFinished' };

export type WebviewMessageType = WebviewMessage['type'];

export function createViewSnapshot(
  pet: PetState,
  battle: BattleRecord | undefined,
  data: GameData = GAME_DATA,
): ViewSnapshot {
  return {
    pet,
    stage: getBattleStage(data.stages.defaultStageId, data),
    fields: getBattleFields(data),
    stages: getBattleStages(data),
    battle: battle ? { record: battle, stage: getBattleStage(battle.stageId, data) } : undefined,
  };
}
