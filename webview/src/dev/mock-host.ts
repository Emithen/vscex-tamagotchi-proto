import {
  createPetCombatant,
  getBattleStage,
  simulateBattle,
  type BattleRecord,
} from '@extension/battle/battle';
import { GAME_SCENARIOS, getGameScenario, type GameScenarioId } from '@extension/data/scenarios';
import {
  addPetExperience,
  applyFullnessDecay,
  feedPet,
  setFullness,
} from '@extension/pet/pet-state';
import { createViewSnapshot, type HostMessage } from '@extension/shared/protocol';
import type { HostBridge } from '../bridge';

const DEV_SCALE_OPTIONS = ['auto', '1', '2', '3', '4', '5', '6'] as const;
type DevScaleOption = (typeof DEV_SCALE_OPTIONS)[number];

/**
 * 브라우저 개발 모드에서 Extension Host 대신 응답한다.
 * 상태는 메모리에만 두며 `?scale=4`, `?scenario=marshtomp-near-evolution`, `?fullness=2`로 초기 상태를 지정할 수 있다.
 */
export function createMockHostBridge(): HostBridge {
  const searchParams = new URLSearchParams(window.location.search);
  let activeScenarioId: GameScenarioId = getInitialScenarioId(searchParams.get('scenario'));
  let scenario = getGameScenario(activeScenarioId);
  let gameData = scenario.gameData;
  const initial = scenario.createInitialState();

  let pet = initial.pet;
  let battle: BattleRecord | undefined = initial.battle;
  const listeners = new Set<(message: HostMessage) => void>();

  const initialFullness = searchParams.get('fullness');
  if (initialFullness !== null) {
    pet = setFullness(pet, Number(initialFullness), Date.now(), gameData);
  }

  const initialScale = getInitialScale(searchParams.get('scale'));
  applyScaleOverride(initialScale);

  const publish = () => {
    pet = applyFullnessDecay(pet, Date.now(), gameData);
    const message: HostMessage = {
      type: 'snapshot',
      snapshot: createViewSnapshot(pet, battle, gameData),
    };
    listeners.forEach((listener) => listener(message));
  };

  mountDevToolbar({
    initialScale,
    initialScenarioId: activeScenarioId,
    onSelectScale(scale) {
      applyScaleOverride(scale);
      updateSearchParam('scale', scale === 'auto' ? undefined : scale);
    },
    onApplyScenario(nextScenarioId) {
      activeScenarioId = nextScenarioId;
      scenario = getGameScenario(nextScenarioId);
      gameData = scenario.gameData;
      const nextInitial = scenario.createInitialState();
      pet = nextInitial.pet;
      battle = nextInitial.battle;
      publish();
    },
  });

  return {
    postMessage(message) {
      if (message.type === 'feed') {
        pet = feedPet(pet, Date.now(), gameData);
      } else if (message.type === 'startBattle' && !battle) {
        const stage = getBattleStage(message.stageId, gameData);
        const petCombatant = createPetCombatant(pet, gameData);
        const simulation = simulateBattle(petCombatant, stage.enemy, gameData);
        battle = {
          ...simulation,
          id: crypto.randomUUID(),
          stageId: stage.id,
          startedAt: Date.now(),
          pet: petCombatant,
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
          ...addPetExperience(pet, battle.experienceReward, gameData),
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

function getInitialScenarioId(rawScenario: string | null): GameScenarioId {
  if (!rawScenario) {
    return 'default';
  }
  return getGameScenario(rawScenario).id;
}

function getInitialScale(rawScale: string | null): DevScaleOption {
  if (rawScale && (DEV_SCALE_OPTIONS as readonly string[]).includes(rawScale)) {
    return rawScale as DevScaleOption;
  }
  return 'auto';
}

function applyScaleOverride(scale: DevScaleOption): void {
  const rootStyle = document.documentElement.style;
  if (scale === 'auto') {
    rootStyle.removeProperty('--pixel-scale-override');
    return;
  }
  rootStyle.setProperty('--pixel-scale-override', scale);
}

function updateSearchParam(key: string, value: string | undefined): void {
  const url = new URL(window.location.href);
  if (value === undefined) {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }
  window.history.replaceState(null, '', url);
}

type DevToolbarOptions = {
  initialScale: DevScaleOption;
  initialScenarioId: GameScenarioId;
  onSelectScale(scale: DevScaleOption): void;
  onApplyScenario(scenarioId: GameScenarioId): void;
};

function mountDevToolbar({
  initialScale,
  initialScenarioId,
  onSelectScale,
  onApplyScenario,
}: DevToolbarOptions): void {
  document.querySelector('.dev-toolbar')?.remove();

  const toolbar = document.createElement('header');
  toolbar.className = 'dev-toolbar';
  toolbar.setAttribute('aria-label', '브라우저 개발 도구');

  const scaleGroup = document.createElement('div');
  scaleGroup.className = 'dev-toolbar-group';
  const scaleLabel = document.createElement('span');
  scaleLabel.className = 'dev-toolbar-label';
  scaleLabel.textContent = '배율';
  scaleGroup.append(scaleLabel);

  const scaleButtons = new Map<DevScaleOption, HTMLButtonElement>();
  for (const option of DEV_SCALE_OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      option === initialScale ? 'dev-toolbar-button is-active' : 'dev-toolbar-button';
    button.textContent = option === 'auto' ? 'Auto' : `${option}×`;
    button.addEventListener('click', () => {
      scaleButtons.forEach((btn, key) => {
        btn.classList.toggle('is-active', key === option);
      });
      onSelectScale(option);
    });
    scaleButtons.set(option, button);
    scaleGroup.append(button);
  }

  const scenarioGroup = document.createElement('div');
  scenarioGroup.className = 'dev-toolbar-group';
  const scenarioLabel = document.createElement('label');
  scenarioLabel.className = 'dev-toolbar-label';
  scenarioLabel.htmlFor = 'dev-scenario-select';
  scenarioLabel.textContent = '시나리오';

  const select = document.createElement('select');
  select.id = 'dev-scenario-select';
  select.className = 'dev-toolbar-select';
  for (const scenario of Object.values(GAME_SCENARIOS)) {
    const option = document.createElement('option');
    option.value = scenario.id;
    option.textContent = scenario.label;
    option.selected = scenario.id === initialScenarioId;
    select.append(option);
  }

  const applyButton = document.createElement('button');
  applyButton.type = 'button';
  applyButton.className = 'dev-toolbar-button is-active';
  applyButton.textContent = '적용';
  applyButton.addEventListener('click', () => {
    onApplyScenario(select.value as GameScenarioId);
  });

  scenarioGroup.append(scenarioLabel, select, applyButton);
  toolbar.append(scaleGroup, scenarioGroup);
  document.body.prepend(toolbar);
}
