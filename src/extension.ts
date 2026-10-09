import * as vscode from 'vscode';
import { PetStateStore } from './pet/pet-state-store';
import { TamagotchiViewProvider } from './pet/tamagotchi-view-provider';
import { PetService } from './pet/pet-service';

export async function activate(context: vscode.ExtensionContext) {
	const store = new PetStateStore(context.globalState);
	const service = new PetService(store);
	const provider = new TamagotchiViewProvider(
		context.extensionUri,
		service,
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			TamagotchiViewProvider.viewType,
			provider,
		),
	);
}

export function deactivate() {}
