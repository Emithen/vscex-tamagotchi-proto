import { describe, expect, it } from 'vitest';
import { getAnimationFrame, validateSpriteAnimation } from './sprite-animation';
import type { SpriteAnimation } from './sprites';

const blink: SpriteAnimation = {
  src: '/sprites/coralfin-blink.png',
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 4,
  frames: [0, 0, 1, 2],
  fps: 4,
  loop: true,
};

describe('getAnimationFrame', () => {
  it('경과 시간에 맞는 프레임을 반복 재생한다', () => {
    expect(getAnimationFrame(0, blink)).toEqual({ frameIndex: 0, done: false });
    expect(getAnimationFrame(500, blink)).toEqual({ frameIndex: 1, done: false });
    expect(getAnimationFrame(1_000, blink)).toEqual({ frameIndex: 0, done: false });
  });

  it('단발 애니메이션은 마지막 프레임에서 종료한다', () => {
    const eat = { ...blink, frames: [0, 1, 2, 3], loop: false };

    expect(getAnimationFrame(750, eat)).toEqual({ frameIndex: 3, done: false });
    expect(getAnimationFrame(1_000, eat)).toEqual({ frameIndex: 3, done: true });
  });
});

describe('validateSpriteAnimation', () => {
  it('프레임 수를 벗어난 프레임 순서를 거부한다', () => {
    expect(() => validateSpriteAnimation({ ...blink, frames: [0, 4] })).toThrow(
      '프레임 순서가 유효하지 않습니다',
    );
  });
});
