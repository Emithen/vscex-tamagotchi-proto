import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import type { BattleRecord } from '../battle/battle';
import { BattleService } from '../battle/battle-service';
import {
  BATTLE_RESULT_REVEAL_DELAY_MS,
  createViewSnapshot,
  type HostMessage,
  type WebviewMessageType,
} from '../shared/protocol';
import { MIN_FULLNESS, type PetState, getFullnessDecayDelay } from './pet-state';
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

  private get webviewRootUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview');
  }

  private get spriteRootUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.extensionUri, 'media', 'pixel', 'sprites');
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.clearRefreshTimer();
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.webviewRootUri, this.spriteRootUri],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

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
  }

  public async refresh(): Promise<void> {
    const webviewView = this.webviewView;
    this.clearRefreshTimer();
    if (!webviewView || !webviewView.visible) {
      return;
    }

    const petState = await this.petService.getState();
    const battle = this.battleService.getBattle();
    if (this.webviewView !== webviewView) {
      return;
    }

    const message: HostMessage = {
      type: 'snapshot',
      snapshot: createViewSnapshot(petState, battle),
    };
    await webviewView.webview.postMessage(message);
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
    } else if (messageType !== 'ready' && messageType !== 'battleFinished') {
      throw new Error(
        `Tamagotchi Webview 메시지 검증 실패: 요청 "${messageType}"을 지원하지 않습니다. "src/shared/protocol.ts"의 "WebviewMessage" 타입을 확인하세요.`,
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
      const battleDelay =
        battle.startedAt + battle.durationMs + BATTLE_RESULT_REVEAL_DELAY_MS - Date.now();
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

  /** Webview 앱을 담는 HTML 셸을 만든다. 화면은 `webview/` 앱이 snapshot으로 렌더링한다. */
  private getHtml(webview: vscode.Webview): string {
    const nonce = randomBytes(16).toString('hex');
    const contentSecurityPolicy = [
      "default-src 'none'",
      `img-src ${webview.cspSource}`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.webviewRootUri, 'style.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.webviewRootUri, 'main.js'));
    const spriteBaseUri = webview.asWebviewUri(this.spriteRootUri);

    return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${styleUri}" />
  </head>
  <body>
    <div id="app" data-sprite-base-uri="${spriteBaseUri}"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

function getMessageType(message: unknown): WebviewMessageType | 'unknown' {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return 'unknown';
  }
  return typeof message.type === 'string' ? (message.type as WebviewMessageType) : 'unknown';
}

function getMessageStageId(message: unknown): string {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('stageId' in message) ||
    typeof message.stageId !== 'string'
  ) {
    throw new Error(
      'Tamagotchi Webview 전투 시작 실패: 요청에서 "stageId"를 찾지 못했습니다. "webview/src/app.tsx"의 전투 시작 메시지를 확인하세요.',
    );
  }

  return message.stageId;
}
