import * as vscode from 'vscode';
import { getGameDataForMode } from './data/game-data';
import { GAME_SCENARIOS, getGameScenario } from './data/scenarios';
import { PetStateStore } from './pet/pet-state-store';
import { TamagotchiViewProvider } from './pet/tamagotchi-view-provider';
import { PetService } from './pet/pet-service';
import { MAX_FULLNESS, MIN_FULLNESS } from './pet/pet-state';
import { BattleStateStore } from './battle/battle-state-store';
import { BattleService } from './battle/battle-service';

const SET_FULLNESS_COMMAND = 'tamagotchi.setFullness';
const RESET_PET_COMMAND = 'tamagotchi.resetPet';
const APPLY_SCENARIO_COMMAND = 'tamagotchi.applyScenario';

export async function activate(context: vscode.ExtensionContext) {
  const mode =
    context.extensionMode === vscode.ExtensionMode.Production
      ? 'production'
      : context.extensionMode === vscode.ExtensionMode.Test
        ? 'test'
        : 'development';
  const gameData = getGameDataForMode(mode);
  const store = new PetStateStore(context.globalState);
  const service = new PetService(store, Date.now, gameData);
  const battleStore = new BattleStateStore(context.globalState);
  const battleService = new BattleService(battleStore, service, Date.now, undefined, gameData);
  const provider = new TamagotchiViewProvider(context.extensionUri, service, battleService);

  const setFullnessCommand = vscode.commands.registerCommand(SET_FULLNESS_COMMAND, async () => {
    const currentState = await service.getState();

    const input = await vscode.window.showInputBox({
      title: 'Tamagotchi 포만감 설정',
      prompt: `${MIN_FULLNESS}부터 ${MAX_FULLNESS}까지의 정수를 입력하세요.`,
      value: String(currentState.fullness),
      validateInput: validateFullnessInput,
    });

    if (input === undefined) {
      return;
    }

    const fullness = Number(input.trim());

    await service.setFullness(fullness);
    await provider.refresh();
  });

  const resetPetCommand = vscode.commands.registerCommand(RESET_PET_COMMAND, async () => {
    await battleStore.save(undefined);
    await service.reset();
    await provider.refresh();
  });

  const applyScenarioCommand = vscode.commands.registerCommand(APPLY_SCENARIO_COMMAND, async () => {
    const items = Object.values(GAME_SCENARIOS).map((scenario) => ({
      label: scenario.label,
      description: scenario.id,
      scenarioId: scenario.id,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Tamagotchi 시나리오 상태 주입',
      placeHolder: '적용할 시나리오 프리셋을 선택하세요.',
    });

    if (!selected) {
      return;
    }

    const scenario = getGameScenario(selected.scenarioId);
    const initial = scenario.createInitialState();
    await battleStore.save(initial.battle);
    await service.replaceState(initial.pet);
    await provider.refresh();
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TamagotchiViewProvider.viewType, provider),
    setFullnessCommand,
    resetPetCommand,
    applyScenarioCommand,
  );
}

export function deactivate() {}

function validateFullnessInput(value: string): string | undefined {
  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return `포만감 입력값 "${value}"이 유효하지 않습니다. ${MIN_FULLNESS}부터 ${MAX_FULLNESS}까지의 정수를 입력하세요.`;
  }

  const fullness = Number(normalizedValue);

  if (fullness < MIN_FULLNESS || fullness > MAX_FULLNESS) {
    return `포만감 입력값 "${value}"이 허용 범위를 벗어났습니다. ${MIN_FULLNESS}부터 ${MAX_FULLNESS}까지의 정수를 입력하세요.`;
  }

  return undefined;
}
