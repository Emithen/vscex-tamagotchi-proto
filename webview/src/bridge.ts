import type { HostMessage, WebviewMessage } from '@extension/shared/protocol';

/** Webview 앱과 Extension Host 사이의 메시지 통로이다. */
export type HostBridge = {
  postMessage(message: WebviewMessage): void;
  subscribe(listener: (message: HostMessage) => void): () => void;
};

/**
 * VS Code Webview 안에서는 `acquireVsCodeApi`를 사용하고,
 * 브라우저 개발 모드에서는 순수 상태 함수로 동작하는 mock host를 사용한다.
 */
export async function createHostBridge(): Promise<HostBridge> {
  if (typeof acquireVsCodeApi === 'function') {
    return createVsCodeBridge(acquireVsCodeApi());
  }

  if (import.meta.env.DEV) {
    const { createMockHostBridge } = await import('./dev/mock-host');
    return createMockHostBridge();
  }

  throw new Error(
    'Tamagotchi Webview 초기화 실패: "acquireVsCodeApi"를 찾지 못했습니다. VS Code Webview 안에서 실행 중인지 확인하고, 브라우저 개발에는 "pnpm run dev:webview"를 사용하세요.',
  );
}

function createVsCodeBridge(vscode: { postMessage(message: unknown): void }): HostBridge {
  return {
    postMessage: (message) => vscode.postMessage(message),
    subscribe: (listener) => {
      const handleMessage = (event: MessageEvent<unknown>) => {
        if (isHostMessage(event.data)) {
          listener(event.data);
        }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    },
  };
}

function isHostMessage(data: unknown): data is HostMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'snapshot' &&
    'snapshot' in data &&
    typeof data.snapshot === 'object' &&
    data.snapshot !== null
  );
}
