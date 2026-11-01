import { render } from 'preact';
import { App } from './app';
import { createHostBridge } from './bridge';
import { SpriteContext, createSpriteLibrary } from './pixel/sprites';
import './style.css';

const root = document.getElementById('app');
const spriteBaseUri = root?.dataset.spriteBaseUri;
if (!root || !spriteBaseUri) {
  throw new Error(
    'Tamagotchi Webview 초기화 실패: 루트 요소 "#app" 또는 "data-sprite-base-uri"를 문서에서 찾지 못했습니다. "tamagotchi-view-provider.ts"의 HTML 셸과 "webview/index.html"을 확인하세요.',
  );
}

const bridge = await createHostBridge();

render(
  <SpriteContext.Provider value={createSpriteLibrary(spriteBaseUri)}>
    <App bridge={bridge} />
  </SpriteContext.Provider>,
  root,
);
