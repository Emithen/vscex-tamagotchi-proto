import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import {
  GRASSLAND_STAGE,
  getBattleStage,
  type BattleRecord,
  type BattleStage,
} from '../battle/battle';
import { BattleService } from '../battle/battle-service';
import { MIN_FULLNESS, type PetState, clampFullness, getFullnessDecayDelay } from './pet-state';
import { PetService } from './pet-service';

export class TamagotchiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tamagotchi.petView';
  private webviewView?: vscode.WebviewView;
  private refreshTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly petService: PetService,
    private readonly battleService: BattleService,
  ) {}

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.clearRefreshTimer();
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };

    const messageSubscription = webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        await this.handleMessage(message);
        await this.refresh();
      } catch (cause: unknown) {
        const error = new Error(
          `Tamagotchi Webview 메시지 처리 실패: 요청 "${getMessageType(message)}"을 처리하지 못했습니다. Extension Host 로그와 저장된 펫·전투 상태를 확인하세요.`,
          { cause },
        );
        console.error(error);
        void vscode.window.showErrorMessage(error.message);
      }
    });

    const visibilitySubscription = webviewView.onDidChangeVisibility(async () => {
      if (this.webviewView !== webviewView) {
        return;
      }
      if (!webviewView.visible) {
        this.clearRefreshTimer();
        return;
      }
      await this.refresh();
    });

    webviewView.onDidDispose(() => {
      messageSubscription.dispose();
      visibilitySubscription.dispose();
      if (this.webviewView === webviewView) {
        this.clearRefreshTimer();
        this.webviewView = undefined;
      }
    });

    await this.refresh();
  }

  public async refresh(): Promise<void> {
    const webviewView = this.webviewView;
    this.clearRefreshTimer();
    if (!webviewView || !webviewView.visible) {
      return;
    }

    const petState = await this.petService.getState();
    const battle = this.battleService.getBattle();
    const html = await this.getHtml(webviewView.webview, petState, battle);
    if (this.webviewView !== webviewView) {
      return;
    }

    webviewView.webview.html = html;
    this.scheduleRefresh(webviewView, petState, battle);
  }

  private async handleMessage(message: unknown): Promise<void> {
    const messageType = getMessageType(message);
    if (messageType === 'feed') {
      await this.petService.feed();
    } else if (messageType === 'startBattle') {
      await this.battleService.startBattle(getMessageStageId(message));
    } else if (messageType === 'claimBattleReward') {
      await this.battleService.claimReward();
    } else if (messageType !== 'battleFinished') {
      throw new Error(
        `Tamagotchi Webview 메시지 검증 실패: 요청 "${messageType}"을 지원하지 않습니다. "media/pet-view/main.js"의 메시지 타입을 확인하세요.`,
      );
    }
  }

  private scheduleRefresh(
    webviewView: vscode.WebviewView,
    petState: PetState,
    battle: BattleRecord | undefined,
  ): void {
    if (this.webviewView !== webviewView || !webviewView.visible) {
      return;
    }

    const delays: number[] = [];
    if (petState.fullness > MIN_FULLNESS) {
      delays.push(getFullnessDecayDelay(petState));
    }
    if (battle) {
      const battleDelay = battle.startedAt + battle.durationMs - Date.now();
      if (battleDelay > 0) {
        delays.push(battleDelay);
      }
    }
    if (delays.length === 0) {
      return;
    }

    this.refreshTimer = setTimeout(
      () => {
        this.refreshTimer = undefined;
        void this.refresh().catch((cause: unknown) => {
          console.error(
            new Error(
              `Tamagotchi Webview 자동 갱신 실패: View "${TamagotchiViewProvider.viewType}"의 펫·전투 상태를 갱신하지 못했습니다. Extension Host 로그와 상태 저장소를 확인하세요.`,
              { cause },
            ),
          );
        });
      },
      Math.max(0, Math.min(...delays)),
    );
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer === undefined) {
      return;
    }
    clearTimeout(this.refreshTimer);
    this.refreshTimer = undefined;
  }

  private async getHtml(
    webview: vscode.Webview,
    petState: PetState,
    battle: BattleRecord | undefined,
  ): Promise<string> {
    const viewRootUri = vscode.Uri.joinPath(this.extensionUri, 'media', 'pet-view');
    const templateBytes = await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(viewRootUri, 'index.html'),
    );
    const petImageUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'pixel', 'sprites', 'coralfin-idle.png'),
    );
    const nonce = randomBytes(16).toString('hex');
    const contentSecurityPolicy = [
      "default-src 'none'",
      `img-src ${webview.cspSource}`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return new TextDecoder()
      .decode(templateBytes)
      .replace('{{contentSecurityPolicy}}', contentSecurityPolicy)
      .replace('{{nonce}}', nonce)
      .replace('{{mainContent}}', renderMainContent(petState, battle, petImageUri.toString()))
      .replace(
        '{{styleUri}}',
        webview.asWebviewUri(vscode.Uri.joinPath(viewRootUri, 'style.css')).toString(),
      )
      .replace(
        '{{scriptUri}}',
        webview.asWebviewUri(vscode.Uri.joinPath(viewRootUri, 'main.js')).toString(),
      );
  }
}

function renderMainContent(
  petState: PetState,
  battle: BattleRecord | undefined,
  petImageUri: string,
): string {
  if (!battle) {
    return renderHome(petState, GRASSLAND_STAGE, petImageUri);
  }
  const stage = getBattleStage(battle.stageId);
  return Date.now() >= battle.startedAt + battle.durationMs
    ? renderBattleResult(battle, stage, petImageUri)
    : renderBattle(battle, stage, petImageUri);
}

function renderHome(petState: PetState, stage: BattleStage, petImageUri: string): string {
  const fullness = clampFullness(petState.fullness);
  return `
    <main class="screen home-screen" data-screen="home">
      ${renderPixelSprite('pet-image', petImageUri, petState.name)}
      <h2>${petState.name}</h2>
      <p class="experience">경험치 ${petState.experience}</p>
      <p class="fullness">포만감: ${fullness} / 10</p>
      <progress aria-label="포만감" max="10" value="${fullness}"></progress>
      <div class="button-stack">
        <button class="primary-button" type="button" data-action="feed">먹이 주기</button>
        <button class="secondary-button" type="button" data-action="openStage">스테이지 선택</button>
      </div>
    </main>
    <main class="screen stage-screen" data-screen="stage" hidden>
      <p class="eyebrow">스테이지 선택</p><h2>${stage.name}</h2>
      <div class="stage-card">
        ${renderPixelSprite('stage-enemy-image', petImageUri, `적 ${stage.enemy.name}`)}
        <p class="stage-enemy-name">적: ${stage.enemy.name}</p>
        <p class="stage-reward">승리 보상: 경험치 +${stage.victoryExperience}</p>
      </div>
      <div class="button-stack">
        <button class="primary-button" type="button" data-action="startBattle" data-stage-id="${stage.id}">전투 시작</button>
        <button class="secondary-button" type="button" data-action="openHome">돌아가기</button>
      </div>
    </main>`;
}

function renderBattle(battle: BattleRecord, stage: BattleStage, petImageUri: string): string {
  const actions = battle.actions
    .map(
      (action) =>
        `<li data-battle-action data-at-ms="${action.atMs}" data-actor="${action.actor}" data-damage="${action.damage}" data-target-hp="${action.targetHp}"></li>`,
    )
    .join('');
  return `
    <main class="screen battle-screen" data-battle-started-at="${battle.startedAt}" data-battle-duration="${battle.durationMs}">
      <p class="eyebrow">${stage.name}</p><h2>전투 진행 중</h2>
      <div class="combatants">
        ${renderCombatant('pet', '내 펫', battle.pet.name, battle.pet.stats.maxHp, petImageUri)}
        <span class="versus">VS</span>
        ${renderCombatant('enemy', '적', battle.enemy.name, battle.enemy.stats.maxHp, petImageUri)}
      </div>
      <p class="battle-log" data-battle-log>전투를 준비하고 있어요.</p>
      <ol hidden>${actions}</ol>
    </main>`;
}

function renderCombatant(
  side: 'pet' | 'enemy',
  label: string,
  name: string,
  maxHp: number,
  petImageUri: string,
): string {
  return `<section class="combatant combatant--${side}">
    <span class="combatant-label">${label}</span>
    ${renderPixelSprite('combatant-image', petImageUri, `${label} ${name}`)}
    <strong>${name}</strong>
    <progress data-hp-bar="${side}" max="${maxHp}" value="${maxHp}"></progress>
    <span class="hp-text" data-hp-text="${side}">${maxHp} / ${maxHp}</span>
  </section>`;
}

function renderBattleResult(battle: BattleRecord, stage: BattleStage, petImageUri: string): string {
  const title =
    battle.result === 'victory' ? '승리!' : battle.result === 'defeat' ? '패배' : '무승부';
  return `<main class="screen result-screen">
    <p class="eyebrow">${stage.name} 결과</p>
    ${renderPixelSprite('pet-image result-image', petImageUri, battle.pet.name)}
    <h2>${title}</h2>
    <p class="result-reward">획득 경험치 <strong>+${battle.experienceReward}</strong></p>
    <button class="primary-button" type="button" data-action="claimBattleReward">보상 받기</button>
  </main>`;
}

function renderPixelSprite(className: string, spriteUri: string, label: string): string {
  return `<canvas
    class="pixel-sprite ${className}"
    width="32"
    height="32"
    data-pixel-sprite
    data-sprite-src="${spriteUri}"
    data-frame-width="32"
    data-frame-height="32"
    data-frame-count="4"
    data-fps="4"
    role="img"
    aria-label="${label}"
  ></canvas>`;
}

function getMessageType(message: unknown): string {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return 'unknown';
  }
  return typeof message.type === 'string' ? message.type : 'unknown';
}

function getMessageStageId(message: unknown): string {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('stageId' in message) ||
    typeof message.stageId !== 'string'
  ) {
    throw new Error(
      'Tamagotchi Webview 전투 시작 실패: 요청에서 "stageId"를 찾지 못했습니다. "media/pet-view/main.js"의 전투 시작 메시지를 확인하세요.',
    );
  }

  return message.stageId;
}
