import * as vscode from 'vscode';
import { PetStateStore } from './pet/pet-state-store';
import { TamagotchiViewProvider } from './pet/tamagotchi-view-provider';
import { PetService } from './pet/pet-service';
import { MAX_FULLNESS, MIN_FULLNESS } from './pet/pet-state';

const SET_FULLNESS_COMMAND = 'tamagotchi.setFullness';

export async function activate(context: vscode.ExtensionContext) {
  const store = new PetStateStore(context.globalState);
  const service = new PetService(store);
  const provider = new TamagotchiViewProvider(context.extensionUri, service);

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

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TamagotchiViewProvider.viewType, provider),
    setFullnessCommand,
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
