import { describe, expect, it } from 'vitest';
import { getHpFillPixels, getHpLevel } from './hp';

describe('getHpFillPixels', () => {
  it('HP 비율을 정수 픽셀 너비로 변환한다', () => {
    expect(getHpFillPixels(20, 20)).toBe(40);
    expect(getHpFillPixels(10, 20)).toBe(20);
    expect(getHpFillPixels(0, 20)).toBe(0);
  });

  it('HP가 남아 있으면 최소 1px을 표시한다', () => {
    expect(getHpFillPixels(1, 1_000)).toBe(1);
  });

  it('허용 범위를 벗어난 HP를 거부한다', () => {
    expect(() => getHpFillPixels(21, 20)).toThrow('허용 범위 "0~20"를 벗어났습니다');
  });
});

describe('getHpLevel', () => {
  it('HP 비율에 따라 게이지 단계를 나눈다', () => {
    expect(getHpLevel(11, 20)).toBe('good');
    expect(getHpLevel(10, 20)).toBe('low');
    expect(getHpLevel(5, 20)).toBe('critical');
  });
});
