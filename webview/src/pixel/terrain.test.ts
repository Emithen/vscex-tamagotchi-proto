import { BATTLE_FIELD_IDS } from '@extension/data/stages';
import { describe, expect, it } from 'vitest';
import {
  BATTLE_TERRAIN_LAYOUT,
  STAGE_TERRAIN_LAYOUT,
  getTerrainLayout,
  renderTerrainPixels,
} from './terrain';

describe('terrain pixel renderer', () => {
  it('스테이지 카드와 전투 화면의 논리 픽셀 크기를 반환한다', () => {
    expect(getTerrainLayout('stage')).toEqual(STAGE_TERRAIN_LAYOUT);
    expect(getTerrainLayout('battle')).toEqual(BATTLE_TERRAIN_LAYOUT);
  });

  it('5개 필드의 스테이지·전투 배경을 16색 이하 완전 불투명 픽셀로 렌더링한다', () => {
    const renderedStageBuffers = new Set<string>();

    for (const fieldId of BATTLE_FIELD_IDS) {
      for (const mode of ['stage', 'battle'] as const) {
        const layout = getTerrainLayout(mode);
        const pixels = renderTerrainPixels(fieldId, mode);
        expect(pixels.length).toBe(layout.width * layout.height * 4);

        const colors = new Set<string>();
        for (let offset = 0; offset < pixels.length; offset += 4) {
          expect(pixels[offset + 3]).toBe(255);
          colors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
        }

        expect(colors.size).toBeGreaterThanOrEqual(6);
        expect(colors.size).toBeLessThanOrEqual(16);

        if (mode === 'stage') {
          renderedStageBuffers.add(pixels.join(','));
        }
      }
    }

    expect(renderedStageBuffers.size).toBe(BATTLE_FIELD_IDS.length);
  });
});
