const vscode = acquireVsCodeApi();

document.querySelectorAll('[data-pixel-sprite]').forEach((element) => {
  if (element instanceof HTMLCanvasElement) {
    startPixelSprite(element);
  }
});

document.querySelector('[data-action="feed"]')?.addEventListener('click', () => {
  vscode.postMessage({ type: 'feed' });
});
document.querySelector('[data-action="openStage"]')?.addEventListener('click', () => {
  showScreen('stage');
});
document.querySelector('[data-action="openHome"]')?.addEventListener('click', () => {
  showScreen('home');
});
document.querySelector('[data-action="startBattle"]')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  if (!(button instanceof HTMLElement) || !button.dataset.stageId) {
    throw new Error(
      'Tamagotchi Webview 전투 시작 실패: 버튼에서 "data-stage-id"를 찾지 못했습니다. "tamagotchi-view-provider.ts"의 스테이지 버튼 렌더링을 확인하세요.',
    );
  }
  vscode.postMessage({ type: 'startBattle', stageId: button.dataset.stageId });
});
document.querySelector('[data-action="claimBattleReward"]')?.addEventListener('click', () => {
  vscode.postMessage({ type: 'claimBattleReward' });
});

function showScreen(screenName) {
  const target = document.querySelector(`[data-screen="${screenName}"]`);
  if (!target) {
    throw new Error(
      `Tamagotchi Webview 화면 전환 실패: 화면 "${screenName}"을 문서에서 찾지 못했습니다. "tamagotchi-view-provider.ts"의 "data-screen"을 확인하세요.`,
    );
  }
  document.querySelectorAll('[data-screen]').forEach((screen) => {
    screen.hidden = screen !== target;
  });
}

const battleScreen = document.querySelector('[data-battle-started-at]');
if (battleScreen instanceof HTMLElement) {
  replayBattle(battleScreen);
}

function replayBattle(screen) {
  const startedAt = Number(screen.dataset.battleStartedAt);
  const duration = Number(screen.dataset.battleDuration);
  const actionElements = [...document.querySelectorAll('[data-battle-action]')];

  for (const actionElement of actionElements) {
    if (!(actionElement instanceof HTMLElement)) {
      continue;
    }
    const actionAt = Number(actionElement.dataset.atMs);
    setTimeout(
      () => applyBattleAction(actionElement),
      Math.max(0, startedAt + actionAt - Date.now()),
    );
  }

  setTimeout(
    () => vscode.postMessage({ type: 'battleFinished' }),
    Math.max(0, startedAt + duration - Date.now()) + 50,
  );
}

function applyBattleAction(actionElement) {
  const actor = actionElement.dataset.actor;
  const target = actor === 'pet' ? 'enemy' : 'pet';
  const targetHp = Number(actionElement.dataset.targetHp);
  const damage = Number(actionElement.dataset.damage);
  const hpBar = document.querySelector(`[data-hp-bar="${target}"]`);
  const hpText = document.querySelector(`[data-hp-text="${target}"]`);
  const battleLog = document.querySelector('[data-battle-log]');

  if (!(hpBar instanceof HTMLProgressElement) || !hpText || !battleLog) {
    throw new Error(
      `Tamagotchi Webview 전투 재생 실패: 대상 "${target}"의 HP 요소를 찾지 못했습니다. "tamagotchi-view-provider.ts"의 "data-hp-bar"와 "data-hp-text"를 확인하세요.`,
    );
  }

  hpBar.value = targetHp;
  hpText.textContent = `${targetHp} / ${hpBar.max}`;
  battleLog.textContent = `${actor === 'pet' ? '내 물짱이' : '적 물짱이'}의 공격! ${damage} 데미지`;
}

function startPixelSprite(canvas) {
  const source = canvas.dataset.spriteSrc;
  const frameWidth = Number(canvas.dataset.frameWidth);
  const frameHeight = Number(canvas.dataset.frameHeight);
  const frameCount = Number(canvas.dataset.frameCount);
  const fps = Number(canvas.dataset.fps);
  const hasValidNumbers = [frameWidth, frameHeight, frameCount, fps].every(
    (value) => Number.isFinite(value) && value > 0,
  );

  if (!source || !hasValidNumbers) {
    throw new Error(
      'Tamagotchi 픽셀 스프라이트 초기화 실패: "data-pixel-sprite"의 소스 또는 프레임 설정이 유효하지 않습니다. "tamagotchi-view-provider.ts"의 "renderPixelSprite"를 확인하세요.',
    );
  }

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(
      'Tamagotchi 픽셀 스프라이트 초기화 실패: Canvas "2d" 컨텍스트를 생성하지 못했습니다. VS Code Webview의 Canvas 지원 상태를 확인하세요.',
    );
  }

  context.imageSmoothingEnabled = false;
  const spriteSheet = new window.Image();
  spriteSheet.addEventListener('load', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animationStartedAt = window.performance.now();

    const drawFrame = (now) => {
      const elapsedSeconds = (now - animationStartedAt) / 1_000;
      const frameIndex = reduceMotion ? 0 : Math.floor(elapsedSeconds * fps) % frameCount;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        spriteSheet,
        frameIndex * frameWidth,
        0,
        frameWidth,
        frameHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      if (!reduceMotion) {
        window.requestAnimationFrame(drawFrame);
      }
    };

    drawFrame(animationStartedAt);
  });
  spriteSheet.addEventListener('error', () => {
    throw new Error(
      `Tamagotchi 픽셀 스프라이트 로드 실패: 이미지 "${source}"을 불러오지 못했습니다. Webview CSP와 "media/pixel/sprites" 경로를 확인하세요.`,
    );
  });
  spriteSheet.src = source;
}
