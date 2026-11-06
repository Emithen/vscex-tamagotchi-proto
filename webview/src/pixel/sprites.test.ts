import { describe, expect, it } from 'vitest';
import { createSpriteLibrary, type SpriteManifest } from './sprites';

const createManifest = (id: string, animation: string): SpriteManifest => ({
  id,
  image: `../sprites/${id}.png`,
  frame: { width: 48, height: 48, columns: 4, rows: 1 },
  animations: { [animation]: { frames: [0, 1, 2, 3], fps: 8, loop: false } },
});

describe('createSpriteLibrary', () => {
  it('스프라이트 세트의 manifest로 재생 정보를 만든다', () => {
    const library = createSpriteLibrary('https://example.test/sprites/', 'mudkip', [
      createManifest('mudkip-attack', 'attack'),
    ]);

    expect(library.get('attack')).toEqual({
      src: 'https://example.test/sprites/mudkip-attack.png',
      frameWidth: 48,
      frameHeight: 48,
      frameCount: 4,
      frames: [0, 1, 2, 3],
      fps: 8,
      loop: false,
    });
  });

  it('다른 스프라이트 세트의 애니메이션은 사용하지 않는다', () => {
    const library = createSpriteLibrary('/sprites', 'mudkip', [
      createManifest('other-attack', 'attack'),
    ]);

    expect(() => library.get('attack')).toThrow('애니메이션 "attack"을 찾지 못했습니다');
  });

  it('번들된 manifest에서 모든 진화 단계의 펫 애니메이션과 프레임 규격을 찾는다', () => {
    const library = createSpriteLibrary('/sprites');
    const names = [
      'idle',
      'blink',
      'eat',
      'happy',
      'hungry',
      'attack',
      'hit',
      'faint',
      'victory',
    ] as const;
    const expectedSizes = [
      ['mudkip', 48],
      ['marshtomp', 64],
      ['swampert', 80],
    ] as const;

    for (const [speciesId, expectedSize] of expectedSizes) {
      for (const name of names) {
        const animation = library.get(name, speciesId);
        expect(animation.frameWidth).toBe(expectedSize);
        expect(animation.frameHeight).toBe(expectedSize);
      }
    }
  });
});
