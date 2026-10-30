const vscode = acquireVsCodeApi();
const spriteAnimationTokens = new WeakMap();
const BATTLE_RESULT_REVEAL_DELAY_MS = 900;
const BATTLE_HIT_DELAY_MS = 125;
const HP_BAR_INNER_WIDTH = 40;
const BATTLE_ANIMATION_FPS = {
  idle: 4,
  attack: 8,
  hit: 8,
  faint: 6,
};

document.querySelectorAll('[data-pixel-sprite]').forEach((element) => {
  if (element instanceof HTMLCanvasElement) {
    startPixelSprite(element);
  }
});

document.querySelector('[data-action="feed"]')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  const petSprite = document.querySelector('[data-home-pet-sprite]');

  if (!(button instanceof HTMLElement) || button.tagName !== 'BUTTON') {
    throw new Error(
      'Tamagotchi 먹이주기 애니메이션 실패: "data-action=feed" 대상이 버튼이 아닙니다. "tamagotchi-view-provider.ts"의 먹이주기 버튼을 확인하세요.',
    );
  }

  if (!(petSprite instanceof HTMLCanvasElement) || !petSprite.dataset.eatSrc) {
    vscode.postMessage({ type: 'feed' });
    return;
  }

  button.setAttribute('disabled', '');
  petSprite.dataset.spriteSrc = petSprite.dataset.eatSrc;
  petSprite.dataset.frameSequence = '0,1,2,3';
  petSprite.dataset.fps = '6';
  petSprite.dataset.loop = 'false';
  startPixelSprite(petSprite, () => vscode.postMessage({ type: 'feed' }));
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
    Math.max(0, startedAt + duration - Date.now()) + BATTLE_RESULT_REVEAL_DELAY_MS,
  );
}

function applyBattleAction(actionElement) {
  const actor = actionElement.dataset.actor;
  if (actor !== 'pet' && actor !== 'enemy') {
    throw new Error(
      `Tamagotchi Webview 전투 애니메이션 실패: 공격 주체 "${actor}"가 "pet" 또는 "enemy"가 아닙니다. "tamagotchi-view-provider.ts"의 "data-actor" 렌더링을 확인하세요.`,
    );
  }
  const target = actor === 'pet' ? 'enemy' : 'pet';
  const targetHp = Number(actionElement.dataset.targetHp);
  const damage = Number(actionElement.dataset.damage);
  const hpBar = document.querySelector(`[data-hp-bar="${target}"]`);
  const hpText = document.querySelector(`[data-hp-text="${target}"]`);
  const battleLog = document.querySelector('[data-battle-log]');

  const maxHp = hpBar instanceof HTMLElement ? Number(hpBar.dataset.maxHp) : Number.NaN;
  if (
    !(hpBar instanceof HTMLElement) ||
    !(hpText instanceof HTMLElement) ||
    !(battleLog instanceof HTMLElement) ||
    !Number.isFinite(maxHp) ||
    maxHp <= 0
  ) {
    throw new Error(
      `Tamagotchi Webview 전투 재생 실패: 대상 "${target}"의 HP 요소 또는 "data-max-hp"를 찾지 못했습니다. "tamagotchi-view-provider.ts"의 "data-hp-bar"와 "data-hp-text"를 확인하세요.`,
    );
  }

  battleLog.textContent = `${actor === 'pet' ? '내 물짱이' : '적 물짱이'}의 공격! ${damage} 데미지`;

  playCombatantAnimation(actor, 'attack', () => playCombatantAnimation(actor, 'idle'));
  window.setTimeout(() => {
    updatePixelHp(hpBar, hpText, targetHp, maxHp);
    showDamageNumber(target, damage);
    showHitFeedback(target);
    if (targetHp <= 0) {
      const targetSprite = getCombatantSprite(target);
      targetSprite.dataset.defeated = 'true';
      playCombatantAnimation(target, 'faint');
      return;
    }
    playCombatantAnimation(target, 'hit', () => playCombatantAnimation(target, 'idle'));
  }, BATTLE_HIT_DELAY_MS);
}

function updatePixelHp(hpBar, hpText, currentHp, maxHp) {
  if (!Number.isFinite(currentHp) || currentHp < 0 || currentHp > maxHp) {
    throw new Error(
      `Tamagotchi Webview HP 갱신 실패: 현재 HP "${currentHp}"가 허용 범위 "0~${maxHp}"를 벗어났습니다. 전투 행동의 "data-target-hp"를 확인하세요.`,
    );
  }

  const fillPixels =
    currentHp === 0 ? 0 : Math.max(1, Math.floor((currentHp / maxHp) * HP_BAR_INNER_WIDTH));
  const hpRatio = currentHp / maxHp;
  hpBar.style.setProperty('--hp-fill-pixels', String(fillPixels));
  hpBar.classList.toggle('is-low', hpRatio > 0.25 && hpRatio <= 0.5);
  hpBar.classList.toggle('is-critical', hpRatio <= 0.25);
  hpBar.setAttribute('aria-valuenow', String(currentHp));
  hpText.textContent = `${currentHp} / ${maxHp}`;
}

function showDamageNumber(side, damage) {
  const combatant = document.querySelector(`.combatant--${side}`);
  if (!(combatant instanceof HTMLElement)) {
    throw new Error(
      `Tamagotchi Webview 데미지 표시 실패: 전투원 "${side}"의 컨테이너를 찾지 못했습니다. "tamagotchi-view-provider.ts"의 "combatant--${side}" 클래스를 확인하세요.`,
    );
  }

  const damageNumber = document.createElement('span');
  damageNumber.className = 'damage-number';
  damageNumber.textContent = `-${damage}`;
  damageNumber.setAttribute('aria-hidden', 'true');
  combatant.append(damageNumber);
  window.setTimeout(() => damageNumber.remove(), 600);
}

function showHitFeedback(side) {
  const canvas = getCombatantSprite(side);
  canvas.classList.remove('is-hit');
  void canvas.offsetWidth;
  canvas.classList.add('is-hit');
  window.setTimeout(() => canvas.classList.remove('is-hit'), 300);
}

function playCombatantAnimation(side, animation, onComplete) {
  const canvas = getCombatantSprite(side);
  if (animation === 'idle' && canvas.dataset.defeated === 'true') {
    return;
  }
  const source = canvas.dataset[`${animation}Src`];
  const fps = BATTLE_ANIMATION_FPS[animation];

  if (!source || !fps) {
    throw new Error(
      `Tamagotchi Webview 전투 애니메이션 실패: 전투원 "${side}"의 "${animation}" 소스 또는 FPS를 찾지 못했습니다. "renderCombatant"의 스프라이트 속성과 "BATTLE_ANIMATION_FPS"를 확인하세요.`,
    );
  }

  canvas.dataset.spriteSrc = source;
  canvas.dataset.frameSequence = '0,1,2,3';
  canvas.dataset.fps = String(fps);
  canvas.dataset.loop = animation === 'idle' ? 'true' : 'false';
  startPixelSprite(canvas, onComplete);
}

function getCombatantSprite(side) {
  const canvas = document.querySelector(`[data-combatant-sprite="${side}"]`);
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(
      `Tamagotchi Webview 전투 애니메이션 실패: 전투원 "${side}"의 Canvas를 찾지 못했습니다. "tamagotchi-view-provider.ts"의 "data-combatant-sprite"를 확인하세요.`,
    );
  }
  return canvas;
}

function startPixelSprite(canvas, onComplete) {
  const source = canvas.dataset.spriteSrc;
  const frameWidth = Number(canvas.dataset.frameWidth);
  const frameHeight = Number(canvas.dataset.frameHeight);
  const frameCount = Number(canvas.dataset.frameCount);
  const fps = Number(canvas.dataset.fps);
  const frameSequence = (canvas.dataset.frameSequence ?? '').split(',').filter(Boolean).map(Number);
  const loop = canvas.dataset.loop !== 'false';
  const hasValidNumbers = [frameWidth, frameHeight, frameCount, fps].every(
    (value) => Number.isFinite(value) && value > 0,
  );
  const hasValidSequence =
    frameSequence.length > 0 &&
    frameSequence.every(
      (frameIndex) => Number.isInteger(frameIndex) && frameIndex >= 0 && frameIndex < frameCount,
    );

  if (!source || !hasValidNumbers || !hasValidSequence) {
    throw new Error(
      'Tamagotchi 픽셀 스프라이트 초기화 실패: "data-pixel-sprite"의 소스, 프레임 설정 또는 "data-frame-sequence"가 유효하지 않습니다. "tamagotchi-view-provider.ts"의 "renderPixelSprite"를 확인하세요.',
    );
  }

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(
      'Tamagotchi 픽셀 스프라이트 초기화 실패: Canvas "2d" 컨텍스트를 생성하지 못했습니다. VS Code Webview의 Canvas 지원 상태를 확인하세요.',
    );
  }

  context.imageSmoothingEnabled = false;
  const animationToken = {};
  spriteAnimationTokens.set(canvas, animationToken);
  const spriteSheet = new window.Image();
  spriteSheet.addEventListener('load', () => {
    if (spriteAnimationTokens.get(canvas) !== animationToken) {
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animationStartedAt = window.performance.now();

    const drawFrameIndex = (frameIndex) => {
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
    };

    const drawFrame = (now) => {
      if (spriteAnimationTokens.get(canvas) !== animationToken) {
        return;
      }
      const elapsedSeconds = (now - animationStartedAt) / 1_000;
      const sequenceIndex = Math.floor(elapsedSeconds * fps);

      if (!loop && sequenceIndex >= frameSequence.length) {
        drawFrameIndex(frameSequence.at(-1));
        spriteAnimationTokens.delete(canvas);
        onComplete?.();
        return;
      }

      const frameIndex = frameSequence[loop ? sequenceIndex % frameSequence.length : sequenceIndex];
      drawFrameIndex(frameIndex);

      window.requestAnimationFrame(drawFrame);
    };

    if (reduceMotion) {
      drawFrameIndex(frameSequence[loop ? 0 : frameSequence.length - 1]);
      if (!loop) {
        spriteAnimationTokens.delete(canvas);
        onComplete?.();
      }
      return;
    }

    drawFrame(animationStartedAt);
  });
  spriteSheet.addEventListener('error', () => {
    throw new Error(
      `Tamagotchi 픽셀 스프라이트 로드 실패: 이미지 "${source}"을 불러오지 못했습니다. Webview CSP와 "media/pixel/sprites" 경로를 확인하세요.`,
    );
  });
  spriteSheet.src = source;
}
