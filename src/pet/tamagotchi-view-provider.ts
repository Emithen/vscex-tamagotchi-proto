import * as vscode from 'vscode';
import { PetState, clampFullness } from './pet-state';
import { PetService } from './pet-service';
import { randomBytes } from 'node:crypto';

export class TamagotchiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'tamagotchi.petView';

  private webviewView?: vscode.WebviewView;

  // Webview View 에게 Extension URI 를 전달
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly petService: PetService,
  ) {}

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };

    const messageSubscription = webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type !== 'feed') {
        return;
      }

      await this.petService.feed();
      await this.refresh();
    });

    webviewView.onDidDispose(() => {
      messageSubscription.dispose();

      if (this.webviewView === webviewView) {
        this.webviewView = undefined;
      }
    });

    await this.refresh();
  }

  public async refresh(): Promise<void> {
    const webviewView = this.webviewView;

    if (!webviewView) {
      return;
    }

    const petState = await this.petService.getState();
    const html = await this.getHtml(webviewView.webview, petState);

    if (this.webviewView !== webviewView) {
      return;
    }

    webviewView.webview.html = html;
  }

  private async getHtml(webview: vscode.Webview, petState: PetState): Promise<string> {
    const templateUri = vscode.Uri.joinPath(this.extensionUri, 'media', 'pet-view', 'index.html');

    const petImageUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'pet-sprite.png'),
    );

    const templateBytes = await vscode.workspace.fs.readFile(templateUri);
    const template = new TextDecoder().decode(templateBytes);

    const fullness = clampFullness(petState.fullness);
    const fullnessClass = `fullness-bar__fill--${fullness}`;

    const viewRootUri = vscode.Uri.joinPath(this.extensionUri, 'media', 'pet-view');

    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(viewRootUri, 'style.css'));

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(viewRootUri, 'main.js'));

    const nonce = createNonce();

    const contentSecurityPolicy = [
      "default-src 'none'",
      `img-src ${webview.cspSource}`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return template
      .replace('{{contentSecurityPolicy}}', contentSecurityPolicy)
      .replace('{{nonce}}', nonce)
      .replace('{{petImageUri}}', petImageUri.toString())
      .replaceAll('{{petName}}', petState.name)
      .replaceAll('{{fullness}}', String(fullness))
      .replace('{{fullnessClass}}', fullnessClass)
      .replace('{{styleUri}}', styleUri.toString())
      .replace('{{scriptUri}}', scriptUri.toString());
  }
}

function createNonce(): string {
  return randomBytes(16).toString('hex');
}
