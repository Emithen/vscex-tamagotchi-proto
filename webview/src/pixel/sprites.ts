import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export type SpriteManifest = {
  id: string;
  image: string;
  frame: { width: number; height: number; columns: number; rows: number };
  animations: Record<string, { frames: number[]; fps: number; loop: boolean }>;
};

export type SpriteAnimation = {
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frames: number[];
  fps: number;
  loop: boolean;
};

export type PetAnimationName =
  'idle' | 'blink' | 'eat' | 'happy' | 'hungry' | 'attack' | 'hit' | 'faint' | 'victory';

export type SpriteLibrary = {
  get(name: PetAnimationName, spriteSet?: string): SpriteAnimation;
};

/** 기본 펫이 사용하는 스프라이트 manifest ID 접두사 */
export const PET_SPRITE_SET = 'mudkip';

const bundledManifests = import.meta.glob<SpriteManifest>('../../../media/pixel/manifests/*.json', {
  eager: true,
  import: 'default',
});

/**
 * `media/pixel/manifests`의 프레임 규격과 애니메이션 설정으로 재생 정보를 만든다.
 * 이미지 경로는 manifest의 파일 이름을 `spriteBaseUri` 아래에서 찾는다.
 */
export function createSpriteLibrary(
  spriteBaseUri: string,
  defaultSpriteSet = PET_SPRITE_SET,
  manifests: SpriteManifest[] = Object.values(bundledManifests),
): SpriteLibrary {
  const animations = new Map<string, SpriteAnimation>();
  const baseUri = spriteBaseUri.replace(/\/$/, '');

  for (const manifest of manifests) {
    const setPrefix = manifest.id.split('-')[0];
    const fileName = manifest.image.split('/').at(-1);
    for (const [name, animation] of Object.entries(manifest.animations)) {
      animations.set(`${setPrefix}:${name}`, {
        src: `${baseUri}/${fileName}`,
        frameWidth: manifest.frame.width,
        frameHeight: manifest.frame.height,
        frameCount: manifest.frame.columns * manifest.frame.rows,
        frames: animation.frames,
        fps: animation.fps,
        loop: animation.loop,
      });
    }
  }

  return {
    get(name, spriteSet = defaultSpriteSet) {
      const animation = animations.get(`${spriteSet}:${name}`);
      if (!animation) {
        throw new Error(
          `Tamagotchi 스프라이트 조회 실패: 스프라이트 세트 "${spriteSet}"에서 애니메이션 "${name}"을 찾지 못했습니다. "media/pixel/manifests"의 manifest ID와 "animations" 키를 확인하세요.`,
        );
      }
      return animation;
    },
  };
}

export const SpriteContext = createContext<SpriteLibrary | undefined>(undefined);

export function useSprites(): SpriteLibrary {
  const library = useContext(SpriteContext);
  if (!library) {
    throw new Error(
      'Tamagotchi 스프라이트 조회 실패: "SpriteContext"가 제공되지 않았습니다. "webview/src/main.tsx"에서 앱을 "SpriteContext.Provider"로 감쌌는지 확인하세요.',
    );
  }
  return library;
}
