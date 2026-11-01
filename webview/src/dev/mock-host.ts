import {
  MUDKIP_COMBATANT,
  getBattleStage,
  simulateBattle,
  type BattleRecord,
} from '@extension/battle/battle';
import {
  applyFullnessDecay,
  createInitialPetState,
  feedPet,
  setFullness,
} from '@extension/pet/pet-state';
import { createViewSnapshot, type HostMessage } from '@extension/shared/protocol';
import type { HostBridge } from '../bridge';

/**
 * 브라우저 개발 모드에서 Extension Host 대신 응답한다.
 * 상태는 메모리에만 두며 `?fullness=2`처럼 초기 포만감을 지정할 수 있다.
 */
export function createMockHostBridge(): HostBridge {
  let pet = createInitialPetState();
  let battle: BattleRecord | undefined;
  const listeners = new Set<(message: HostMessage) => void>();

  const initialFullness = new URLSearchParams(window.location.search).get('fullness');
  if (initialFullness !== null) {
    pet = setFullness(pet, Number(initialFullness));
  }

  const publish = () => {
    pet = applyFullnessDecay(pet);
    const message: HostMessage = { type: 'snapshot', snapshot: createViewSnapshot(pet, battle) };
    listeners.forEach((listener) => listener(message));
  };

  return {
    postMessage(message) {
      if (message.type === 'feed') {
        pet = feedPet(pet);
      } else if (message.type === 'startBattle' && !battle) {
        const stage = getBattleStage(message.stageId);
        const simulation = simulateBattle(MUDKIP_COMBATANT, stage.enemy);
        battle = {
          ...simulation,
          id: crypto.randomUUID(),
          stageId: stage.id,
          startedAt: Date.now(),
          pet: MUDKIP_COMBATANT,
          enemy: stage.enemy,
          experienceReward: simulation.result === 'victory' ? stage.victoryExperience : 0,
          rewardClaimed: false,
        };
      } else if (
        message.type === 'claimBattleReward' &&
        battle &&
        Date.now() >= battle.startedAt + battle.durationMs
      ) {
        pet = {
          ...pet,
          experience: pet.experience + battle.experienceReward,
          lastRewardedBattleId: battle.id,
        };
        battle = undefined;
      }
      queueMicrotask(publish);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
