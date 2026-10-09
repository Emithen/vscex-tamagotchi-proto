import * as vscode from 'vscode';

const PET_STATE_KEY = 'tamagotchi.petState';
const DEFAULT_FULLNESS = 5;
const MIN_FULLNESS = 0;
const MAX_FULLNESS = 10;

type PetState = {
	name: string;
	fullness: number;
	updatedAt: number;
};

function clampFullness(fullness: number): number {
	return Math.min(MAX_FULLNESS, Math.max(MIN_FULLNESS, fullness));
}

function createInitialPetState(): PetState {
	return {
		name: '물짱이',
		fullness: DEFAULT_FULLNESS,
		updatedAt: Date.now(),
	};
}

class PetStateStore {
	constructor(private readonly globalState: vscode.Memento) {}

	// 있으면 불러오고 없으면 초기화
	async load(): Promise<PetState> {
		const savedState = this.globalState.get<PetState>(PET_STATE_KEY);

		if (savedState) {
			return savedState;
		}

		const initialState = createInitialPetState();
		await this.save(initialState);

		return initialState;
	}

	async save(petState: PetState): Promise<void> {
		await this.globalState.update(PET_STATE_KEY, petState);
	}
}

export async function activate(context: vscode.ExtensionContext) {
	const petStateStore = new PetStateStore(context.globalState);
	const petState = await petStateStore.load();

	console.log('Loaded pet state: ', petState);

	const provider = new TamagotchiViewProvider(
		context.extensionUri,
		petStateStore,
	);

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
	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly petStateStore: PetStateStore,
	) {}

	async resolveWebviewView(
		webviewView: vscode.WebviewView,
	): Promise<void> {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this.extensionUri, 'media'),
			]
		};

		const petState = await this.petStateStore.load();

		webviewView.webview.html = await this.getHtml(
			webviewView.webview,
			petState,
		);

		webviewView.webview.onDidReceiveMessage(async (message) => {
			if (message.type !== 'feed') {
				return;
			}

			const currentState = await this.petStateStore.load();

			const nextState: PetState = {
				...currentState,
				fullness: clampFullness(currentState.fullness + 1),
				updatedAt: Date.now(),
			};

			await this.petStateStore.save(nextState);

			webviewView.webview.html = await this.getHtml(
				webviewView.webview,
				nextState,
			);
		});
	};

	private async getHtml(
		webview: vscode.Webview,
		petState: PetState,
	): Promise<string> {
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

		const fullness = clampFullness(petState.fullness);
		const fullnessClass = `fullness-bar__fill--${fullness}`;

		return template
			.replace('{{petImageUri}}', petImageUri.toString())
			.replaceAll('{{petName}}', petState.name)
			.replaceAll('{{fullness}}', String(fullness))
			.replace('{{fullnessClass}}', fullnessClass);
	}
}
