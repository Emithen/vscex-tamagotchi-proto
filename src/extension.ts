import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const provider = new TamagotchiViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			TamagotchiViewProvider.viewType,
			provider,
		),
	);
}

export function deactivate() {}

class TamagotchiViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'tamagotchi.petView';

	// Webview View 에게 Extension URI 를 전달
	constructor(private readonly extensionUri: vscode.Uri) {}

	async resolveWebviewView(
		webviewView: vscode.WebviewView,
	): Promise<void> {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this.extensionUri, 'media'),
			]
		};

		webviewView.webview.html = await this.getHtml(webviewView.webview);
	};

	private async getHtml(webview: vscode.Webview): Promise<string> {
		const templateUri = vscode.Uri.joinPath(
			this.extensionUri,
			'media',
			'pet-view.html',
		);

		const petImageUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'media', 'pet-sprite.png'),
		);

		const templateBytes = await vscode.workspace.fs.readFile(templateUri);
		const template = new TextDecoder().decode(templateBytes);

		return template.replace('{{petImageUri}}', petImageUri.toString());
	}
}
