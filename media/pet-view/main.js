const vscode = acquireVsCodeApi();
const feedButton = document.querySelector('.feed-button');

feedButton.addEventListener('click', () => {
	vscode.postMessage({
		type: 'feed',
	});
});
