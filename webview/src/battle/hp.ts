/** `.pixel-hp` 내부 채움 영역의 너비(px) */
export const HP_BAR_INNER_WIDTH = 40;

export type HpLevel = 'good' | 'low' | 'critical';

/** HP를 1px 단위 게이지 너비로 변환한다. HP가 남아 있으면 최소 1px을 표시한다. */
export function getHpFillPixels(currentHp: number, maxHp: number): number {
  validateHp(currentHp, maxHp);
  return currentHp === 0 ? 0 : Math.max(1, Math.floor((currentHp / maxHp) * HP_BAR_INNER_WIDTH));
}

export function getHpLevel(currentHp: number, maxHp: number): HpLevel {
  validateHp(currentHp, maxHp);
  const ratio = currentHp / maxHp;
  return ratio <= 0.25 ? 'critical' : ratio <= 0.5 ? 'low' : 'good';
}

function validateHp(currentHp: number, maxHp: number): void {
  if (!Number.isFinite(maxHp) || maxHp <= 0) {
    throw new Error(
      `Tamagotchi Webview HP 갱신 실패: 최대 HP "${maxHp}"가 0보다 큰 유한수가 아닙니다. 전투원 스탯의 "maxHp"를 확인하세요.`,
    );
  }
  if (!Number.isFinite(currentHp) || currentHp < 0 || currentHp > maxHp) {
    throw new Error(
      `Tamagotchi Webview HP 갱신 실패: 현재 HP "${currentHp}"가 허용 범위 "0~${maxHp}"를 벗어났습니다. 전투 행동의 "targetHp"를 확인하세요.`,
    );
  }
}
