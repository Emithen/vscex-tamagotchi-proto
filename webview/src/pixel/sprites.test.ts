import { describe, expect, it } from 'vitest';
import { createSpriteLibrary, type SpriteManifest } from './sprites';

const createManifest = (id: string, animation: string): SpriteManifest => ({
  id,
  image: `../sprites/${id}.png`,
  frame: { width: 32, height: 32, columns: 4, rows: 1 },
  animations: { [animation]: { frames: [0, 1, 2, 3], fps: 8, loop: false } },
});

describe('createSpriteLibrary', () => {
  it('스프라이트 세트의 manifest로 재생 정보를 만든다', () => {
    const library = createSpriteLibrary('https://example.test/sprites/', 'coralfin', [
      createManifest('coralfin-attack', 'attack'),
    ]);

    expect(library.get('attack')).toEqual({
      src: 'https://example.test/sprites/coralfin-attack.png',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
      frames: [0, 1, 2, 3],
      fps: 8,
      loop: false,
    });
  });

  it('다른 스프라이트 세트의 애니메이션은 사용하지 않는다', () => {
    const library = createSpriteLibrary('/sprites', 'coralfin', [
      createManifest('other-attack', 'attack'),
    ]);

    expect(() => library.get('attack')).toThrow('애니메이션 "attack"을 찾지 못했습니다');
  });

  it('번들된 manifest에서 모든 펫 애니메이션을 찾는다', () => {
    const library = createSpriteLibrary('/sprites');
    const names = ['idle', 'blink', 'eat', 'happy', 'hungry', 'attack', 'hit', 'faint', 'victory'];

    for (const name of names) {
      expect(() => library.get(name as Parameters<typeof library.get>[0])).not.toThrow();
    }
  });
});
