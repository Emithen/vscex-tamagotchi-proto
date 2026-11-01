import type { SpriteAnimation } from './sprites';

const spriteSheets = new Map<string, Promise<HTMLImageElement>>();

/**
 * 재생 시작 후 경과 시간에 해당하는 프레임을 계산한다.
 * 반복하지 않는 애니메이션은 마지막 프레임에서 `done`을 반환한다.
 */
export function getAnimationFrame(
  elapsedMs: number,
  animation: Pick<SpriteAnimation, 'frames' | 'fps' | 'loop'>,
): { frameIndex: number; done: boolean } {
  const { frames, fps, loop } = animation;
  const sequenceIndex = Math.max(0, Math.floor((elapsedMs / 1_000) * fps));

  if (!loop && sequenceIndex >= frames.length) {
    return { frameIndex: frames[frames.length - 1], done: true };
  }
  return {
    frameIndex: frames[loop ? sequenceIndex % frames.length : sequenceIndex],
    done: false,
  };
}

export function validateSpriteAnimation(animation: SpriteAnimation): void {
  const { src, frameWidth, frameHeight, frameCount, fps, frames } = animation;
  const hasValidNumbers = [frameWidth, frameHeight, frameCount, fps].every(
    (value) => Number.isFinite(value) && value > 0,
  );
  const hasValidSequence =
    frames.length > 0 &&
    frames.every(
      (frameIndex) => Number.isInteger(frameIndex) && frameIndex >= 0 && frameIndex < frameCount,
    );

  if (!src || !hasValidNumbers || !hasValidSequence) {
    throw new Error(
      `Tamagotchi 픽셀 스프라이트 초기화 실패: 스프라이트 "${src}"의 프레임 크기, FPS 또는 프레임 순서가 유효하지 않습니다. "media/pixel/manifests"의 "frame"과 "animations" 설정을 확인하세요.`,
    );
  }
}

/**
 * Canvas에 스프라이트 애니메이션을 재생하고 중단 함수를 반환한다.
 * 모션 감소 설정에서는 반복 애니메이션의 첫 프레임 또는 단발 애니메이션의 마지막 프레임만 그린다.
 */
export function playSpriteAnimation(
  canvas: HTMLCanvasElement,
  animation: SpriteAnimation,
  onComplete?: () => void,
): () => void {
  validateSpriteAnimation(animation);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(
      'Tamagotchi 픽셀 스프라이트 초기화 실패: Canvas "2d" 컨텍스트를 생성하지 못했습니다. VS Code Webview의 Canvas 지원 상태를 확인하세요.',
    );
  }

  let cancelled = false;
  let frameRequest: number | undefined;

  void loadSpriteSheet(animation.src)
    .then((spriteSheet) => {
      if (cancelled) {
        return;
      }
      context.imageSmoothingEnabled = false;
      const drawFrameIndex = (frameIndex: number) => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(
          spriteSheet,
          frameIndex * animation.frameWidth,
          0,
          animation.frameWidth,
          animation.frameHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      };

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        drawFrameIndex(animation.frames[animation.loop ? 0 : animation.frames.length - 1]);
        if (!animation.loop) {
          onComplete?.();
        }
        return;
      }

      const startedAt = window.performance.now();
      const drawFrame = (now: number) => {
        if (cancelled) {
          return;
        }
        const { frameIndex, done } = getAnimationFrame(now - startedAt, animation);
        drawFrameIndex(frameIndex);
        if (done) {
          onComplete?.();
          return;
        }
        frameRequest = window.requestAnimationFrame(drawFrame);
      };
      drawFrame(startedAt);
    })
    .catch((cause: unknown) => {
      window.reportError(
        new Error(
          `Tamagotchi 픽셀 스프라이트 로드 실패: 이미지 "${animation.src}"을 불러오지 못했습니다. Webview CSP와 "media/pixel/sprites" 경로를 확인하세요.`,
          { cause },
        ),
      );
    });

  return () => {
    cancelled = true;
    if (frameRequest !== undefined) {
      window.cancelAnimationFrame(frameRequest);
    }
  };
}

function loadSpriteSheet(src: string): Promise<HTMLImageElement> {
  let spriteSheet = spriteSheets.get(src);
  if (!spriteSheet) {
    spriteSheet = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', () => {
        spriteSheets.delete(src);
        reject(new Error(`이미지 요청 실패: "${src}"`));
      });
      image.src = src;
    });
    spriteSheets.set(src, spriteSheet);
  }
  return spriteSheet;
}
