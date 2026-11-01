import { useEffect, useRef } from 'preact/hooks';
import { playSpriteAnimation } from '../pixel/sprite-animation';
import type { SpriteAnimation } from '../pixel/sprites';

type PixelSpriteProps = {
  animation: SpriteAnimation;
  label: string;
  className?: string;
  /** 같은 애니메이션을 처음부터 다시 재생할 때 값을 바꾼다. */
  playKey?: number;
  onComplete?: () => void;
};

export function PixelSprite({
  animation,
  label,
  className,
  playKey,
  onComplete,
}: PixelSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    return playSpriteAnimation(canvas, animation, () => onCompleteRef.current?.());
  }, [animation, playKey]);

  return (
    <canvas
      ref={canvasRef}
      class={className ? `pixel-sprite ${className}` : 'pixel-sprite'}
      width={animation.frameWidth}
      height={animation.frameHeight}
      role="img"
      aria-label={label}
    />
  );
}
