import type { BattleFieldId } from '@extension/battle/battle';
import { useEffect, useRef } from 'preact/hooks';
import { drawTerrainToCanvas, getTerrainLayout, type TerrainMode } from '../pixel/terrain';

type TerrainBackdropProps = {
  fieldId: BattleFieldId;
  mode: TerrainMode;
  className?: string;
};

export function TerrainBackdrop({ fieldId, mode, className }: TerrainBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layout = getTerrainLayout(mode);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    drawTerrainToCanvas(canvas, fieldId, mode);
  }, [fieldId, mode]);

  return (
    <canvas
      ref={canvasRef}
      class={className ? `terrain-backdrop ${className}` : 'terrain-backdrop'}
      width={layout.width}
      height={layout.height}
      aria-hidden="true"
    />
  );
}
