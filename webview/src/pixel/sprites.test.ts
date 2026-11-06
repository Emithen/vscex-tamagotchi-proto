import { getBattleStages } from '@extension/battle/battle';
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

  it('번들된 manifest에서 15개 스테이지 적 포켓몬의 전투 애니메이션을 모두 찾는다', () => {
    const library = createSpriteLibrary('/sprites');
    const battleAnimations = ['idle', 'attack', 'hit', 'faint'] as const;
    const expectedSizeByStageNumber = { 1: 48, 2: 64, 3: 80 } as const;

    for (const stage of getBattleStages()) {
      const spriteSet = stage.enemy.spriteId ?? stage.enemy.id;
      const expectedSize = expectedSizeByStageNumber[stage.stageNumber];
      for (const name of battleAnimations) {
        const animation = library.get(name, spriteSet);
        expect(animation.frameWidth).toBe(expectedSize);
        expect(animation.frameHeight).toBe(expectedSize);
      }
    }
  });
});
