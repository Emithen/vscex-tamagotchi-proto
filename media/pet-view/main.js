const vscode = acquireVsCodeApi();

document.querySelector('[data-action="feed"]')?.addEventListener('click', () => {
  vscode.postMessage({ type: 'feed' });
});
document.querySelector('[data-action="openStage"]')?.addEventListener('click', () => {
  showScreen('stage');
});
document.querySelector('[data-action="openHome"]')?.addEventListener('click', () => {
  showScreen('home');
});
document.querySelector('[data-action="startBattle"]')?.addEventListener('click', () => {
  vscode.postMessage({ type: 'startBattle' });
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
