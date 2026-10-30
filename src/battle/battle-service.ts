import { randomUUID } from 'node:crypto';
import { PetService } from '../pet/pet-service';
import {
  GRASSLAND_STAGE_ID,
  MUDKIP_COMBATANT,
  getBattleStage,
  simulateBattle,
  type BattleRecord,
} from './battle';
import { BattleStateStore } from './battle-state-store';

type BattleStorage = Pick<BattleStateStore, 'load' | 'save'>;

export class BattleService {
  constructor(
    private readonly store: BattleStorage,
    private readonly petService: PetService,
    private readonly now: () => number = Date.now,
    private readonly createId: () => string = randomUUID,
  ) {}

  getBattle(): BattleRecord | undefined {
    const battle = this.store.load();
    return battle?.rewardClaimed ? undefined : battle;
  }

  async startBattle(stageId: string = GRASSLAND_STAGE_ID): Promise<BattleRecord> {
    const currentBattle = this.getBattle();

    if (currentBattle) {
      return currentBattle;
    }

    const stage = getBattleStage(stageId);
    const simulation = simulateBattle(MUDKIP_COMBATANT, stage.enemy);
    const battle: BattleRecord = {
      ...simulation,
      id: this.createId(),
      stageId: stage.id,
      startedAt: this.now(),
      pet: MUDKIP_COMBATANT,
      enemy: stage.enemy,
      experienceReward: simulation.result === 'victory' ? stage.victoryExperience : 0,
      rewardClaimed: false,
    };

    await this.store.save(battle);
    return battle;
  }

  async claimReward(): Promise<BattleRecord> {
    const battle = this.store.load();

    if (!battle) {
      throw new Error(
        '전투 보상 수령 실패: 저장된 전투를 찾지 못했습니다. "초원 1"에서 전투를 다시 시작하세요.',
      );
    }

    if (this.now() < battle.startedAt + battle.durationMs) {
      throw new Error(
        `전투 보상 수령 실패: 전투 "${battle.id}"이 아직 진행 중입니다. 전투 결과 화면이 표시된 뒤 다시 시도하세요.`,
      );
    }

    if (battle.rewardClaimed) {
      return battle;
    }

    await this.petService.addBattleExperience(battle.id, battle.experienceReward);
    const claimedBattle = { ...battle, rewardClaimed: true };
    await this.store.save(claimedBattle);

    return claimedBattle;
  }
}
