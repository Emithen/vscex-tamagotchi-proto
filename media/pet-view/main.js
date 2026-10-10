const vscode = acquireVsCodeApi();
const feedButton = document.querySelector('.feed-button');

if (!feedButton) {
  throw new Error(
    'Tamagotchi Webview 초기화 실패: 필수 요소 ".feed-button"을 문서에서 찾지 못했습니다. index.html의 버튼 클래스와 main.js의 선택자를 확인하세요.',
  );
}

feedButton.addEventListener('click', () => {
  vscode.postMessage({
    type: 'feed',
  });
});
