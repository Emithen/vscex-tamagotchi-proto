import type { BattleFieldId } from '@extension/battle/battle';

export type TerrainMode = 'stage' | 'battle';

export type PlatformSpec = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

export type TerrainLayout = {
  width: number;
  height: number;
  horizonY: number;
  platforms: PlatformSpec[];
};

export const STAGE_TERRAIN_LAYOUT: TerrainLayout = {
  width: 126,
  height: 54,
  horizonY: 22,
  platforms: [{ cx: 63, cy: 46, rx: 30, ry: 6 }],
};

export const BATTLE_TERRAIN_LAYOUT: TerrainLayout = {
  width: 128,
  height: 60,
  horizonY: 24,
  platforms: [
    { cx: 28, cy: 51, rx: 25, ry: 6 },
    { cx: 100, cy: 51, rx: 25, ry: 6 },
  ],
};

type RgbColor = readonly [number, number, number];

type FieldPalette = {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  cloudMain: string;
  cloudShade: string;
  horizonDark: string;
  horizonMid: string;
  horizonLight: string;
  groundMain: string;
  groundAlt: string;
  groundDetail: string;
  accentBright: string;
  platformBorder: string;
  platformRim: string;
  platformInner: string;
  platformShade: string;
};

export const FIELD_PALETTES: Record<BattleFieldId, FieldPalette> = {
  grassland: {
    skyTop: '#68b8f8',
    skyMid: '#90d0ff',
    skyBottom: '#c0e8ff',
    cloudMain: '#f8f8f8',
    cloudShade: '#d0e8f8',
    horizonDark: '#287028',
    horizonMid: '#409838',
    horizonLight: '#60c048',
    groundMain: '#78d860',
    groundAlt: '#60c048',
    groundDetail: '#388828',
    accentBright: '#f8e858',
    platformBorder: '#287028',
    platformRim: '#58b840',
    platformInner: '#d8f0a0',
    platformShade: '#b8dc78',
  },
  beach: {
    skyTop: '#50a8f8',
    skyMid: '#80c8ff',
    skyBottom: '#b8e8ff',
    cloudMain: '#f8f8f8',
    cloudShade: '#c8f0ff',
    horizonDark: '#1860b8',
    horizonMid: '#2888d8',
    horizonLight: '#48b8e8',
    groundMain: '#f8e098',
    groundAlt: '#ecd080',
    groundDetail: '#d0b060',
    accentBright: '#f89898',
    platformBorder: '#987838',
    platformRim: '#d0b060',
    platformInner: '#fff0b8',
    platformShade: '#ecd080',
  },
  marsh: {
    skyTop: '#403858',
    skyMid: '#585070',
    skyBottom: '#787090',
    cloudMain: '#9890b0',
    cloudShade: '#787090',
    horizonDark: '#203020',
    horizonMid: '#304830',
    horizonLight: '#486040',
    groundMain: '#504030',
    groundAlt: '#385848',
    groundDetail: '#282018',
    accentBright: '#b070d0',
    platformBorder: '#282018',
    platformRim: '#486040',
    platformInner: '#887050',
    platformShade: '#68543c',
  },
  cave: {
    skyTop: '#181c28',
    skyMid: '#242c3c',
    skyBottom: '#30384c',
    cloudMain: '#445064',
    cloudShade: '#30384c',
    horizonDark: '#181c28',
    horizonMid: '#30384c',
    horizonLight: '#445064',
    groundMain: '#586478',
    groundAlt: '#445064',
    groundDetail: '#242c3c',
    accentBright: '#68d0f8',
    platformBorder: '#181c28',
    platformRim: '#687488',
    platformInner: '#98a4b8',
    platformShade: '#7c889c',
  },
  volcano: {
    skyTop: '#300c0c',
    skyMid: '#501818',
    skyBottom: '#782420',
    cloudMain: '#983828',
    cloudShade: '#501818',
    horizonDark: '#200808',
    horizonMid: '#381414',
    horizonLight: '#b82818',
    groundMain: '#382020',
    groundAlt: '#281414',
    groundDetail: '#b82818',
    accentBright: '#f8c840',
    platformBorder: '#200808',
    platformRim: '#d84018',
    platformInner: '#78443c',
    platformShade: '#58302c',
  },
};

export function getTerrainLayout(mode: TerrainMode): TerrainLayout {
  return mode === 'battle' ? BATTLE_TERRAIN_LAYOUT : STAGE_TERRAIN_LAYOUT;
}

/**
 * 정수 픽셀 버퍼(`Uint8ClampedArray`, RGBA)에 지형 배경과 발판을 그린다.
 * 모든 좌표는 정수 격자에 정렬되며 반투명 픽셀을 만들지 않는다(`alpha = 255`).
 */
export function renderTerrainPixels(fieldId: BattleFieldId, mode: TerrainMode): Uint8ClampedArray {
  const layout = getTerrainLayout(mode);
  const palette = FIELD_PALETTES[fieldId];
  const buffer = new Uint8ClampedArray(layout.width * layout.height * 4);

  const setPixel = (x: number, y: number, hex: string) => {
    if (x < 0 || x >= layout.width || y < 0 || y >= layout.height) {
      return;
    }
    const [r, g, b] = parseHex(hex);
    const offset = (y * layout.width + x) * 4;
    buffer[offset] = r;
    buffer[offset + 1] = g;
    buffer[offset + 2] = b;
    buffer[offset + 3] = 255;
  };

  const fillRect = (x: number, y: number, w: number, h: number, hex: string) => {
    for (let py = y; py < y + h; py += 1) {
      for (let px = x; px < x + w; px += 1) {
        setPixel(px, py, hex);
      }
    }
  };

  const fillEllipse = (cx: number, cy: number, rx: number, ry: number, hex: string) => {
    for (let py = cy - ry; py <= cy + ry; py += 1) {
      for (let px = cx - rx; px <= cx + rx; px += 1) {
        const dx = (px - cx) / rx;
        const dy = (py - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          setPixel(px, py, hex);
        }
      }
    }
  };

  // 1. 하늘 / 천장 3단 배경
  const skyBand1 = Math.floor(layout.horizonY * 0.4);
  const skyBand2 = Math.floor(layout.horizonY * 0.75);
  fillRect(0, 0, layout.width, skyBand1, palette.skyTop);
  fillRect(0, skyBand1, layout.width, skyBand2 - skyBand1, palette.skyMid);
  fillRect(0, skyBand2, layout.width, layout.horizonY - skyBand2, palette.skyBottom);

  // 2. 지면 기본 채우기
  fillRect(0, layout.horizonY, layout.width, layout.height - layout.horizonY, palette.groundMain);

  // 3. 지형별 원경·중경 디테일
  if (fieldId === 'grassland') {
    drawCloud(fillRect, 18, 5, palette.cloudMain, palette.cloudShade);
    drawCloud(fillRect, 84, 7, palette.cloudMain, palette.cloudShade);
    // 원경 수풀 언덕
    for (const hillX of [12, 38, 66, 94, 118]) {
      fillEllipse(hillX, layout.horizonY, 16, 6, palette.horizonMid);
      fillEllipse(hillX, layout.horizonY - 1, 12, 4, palette.horizonLight);
    }
    fillRect(0, layout.horizonY, layout.width, 2, palette.horizonDark);
    // 잔디 결 & 들꽃
    for (let y = layout.horizonY + 4; y < layout.height; y += 6) {
      fillRect(0, y, layout.width, 2, palette.groundAlt);
    }
    for (const [gx, gy] of [
      [10, layout.horizonY + 6],
      [48, layout.horizonY + 9],
      [64, layout.horizonY + 5],
      [82, layout.horizonY + 11],
      [114, layout.horizonY + 7],
    ]) {
      setPixel(gx, gy, palette.groundDetail);
      setPixel(gx + 1, gy - 1, palette.groundDetail);
      setPixel(gx + 2, gy, palette.groundDetail);
      setPixel(gx + 4, gy, palette.accentBright);
    }
  } else if (fieldId === 'beach') {
    drawCloud(fillRect, 24, 4, palette.cloudMain, palette.cloudShade);
    drawCloud(fillRect, 90, 6, palette.cloudMain, palette.cloudShade);
    // 수평선 바다와 얕은 파도
    fillRect(0, layout.horizonY - 4, layout.width, 4, palette.horizonDark);
    fillRect(0, layout.horizonY, layout.width, 5, palette.horizonMid);
    fillRect(0, layout.horizonY + 5, layout.width, 4, palette.horizonLight);
    // 하얀 파도 거품 라인
    for (let x = 0; x < layout.width; x += 1) {
      const waveOffset = (x % 8 < 4 ? 0 : 1) + layout.horizonY + 9;
      setPixel(x, waveOffset, palette.cloudMain);
      setPixel(x, waveOffset + 1, palette.cloudShade);
    }
    // 젖은 모래 경계와 조개 포인트
    fillRect(0, layout.horizonY + 11, layout.width, 3, palette.groundDetail);
    for (const [sx, sy] of [
      [16, layout.horizonY + 18],
      [62, layout.horizonY + 16],
      [108, layout.horizonY + 19],
    ]) {
      fillRect(sx, sy, 2, 2, palette.accentBright);
      setPixel(sx + 1, sy, palette.cloudMain);
    }
  } else if (fieldId === 'marsh') {
    // 자욱한 안개 띠
    fillRect(0, layout.horizonY - 6, layout.width, 2, palette.cloudMain);
    fillRect(0, layout.horizonY - 3, layout.width, 2, palette.cloudShade);
    // 원경 맹그로브 수풀과 부들(갈대)
    for (const treeX of [14, 44, 76, 108]) {
      fillEllipse(treeX, layout.horizonY, 15, 6, palette.horizonDark);
      fillEllipse(treeX, layout.horizonY - 1, 11, 4, palette.horizonMid);
    }
    for (const reedX of [6, 28, 58, 92, 120]) {
      fillRect(reedX, layout.horizonY - 7, 1, 8, palette.horizonLight);
      fillRect(reedX, layout.horizonY - 9, 2, 3, palette.groundDetail);
    }
    // 늪지 물웅덩이와 독기 방울
    fillEllipse(32, layout.horizonY + 10, 22, 4, palette.groundAlt);
    fillEllipse(94, layout.horizonY + 12, 24, 5, palette.groundAlt);
    for (const [bx, by] of [
      [26, layout.horizonY + 9],
      [38, layout.horizonY + 11],
      [64, layout.horizonY + 15],
      [88, layout.horizonY + 11],
      [102, layout.horizonY + 13],
    ]) {
      fillRect(bx, by, 2, 2, palette.accentBright);
    }
  } else if (fieldId === 'cave') {
    // 동굴 천장 종유석
    for (let x = 0; x < layout.width; x += 8) {
      const stalactiteHeight = 5 + ((x * 7) % 9);
      fillRect(x, 0, 6, Math.min(stalactiteHeight, layout.horizonY - 2), palette.horizonDark);
      fillRect(
        x + 1,
        0,
        3,
        Math.max(2, Math.min(stalactiteHeight - 2, layout.horizonY - 4)),
        palette.horizonMid,
      );
    }
    // 암벽 경계선과 바위 결
    fillRect(0, layout.horizonY - 2, layout.width, 3, palette.horizonDark);
    for (let y = layout.horizonY + 5; y < layout.height; y += 7) {
      fillRect(0, y, layout.width, 2, palette.groundAlt);
    }
    // 푸른 광석 크리스탈 포인트
    for (const [cx, cy] of [
      [14, layout.horizonY + 6],
      [62, layout.horizonY + 8],
      [112, layout.horizonY + 5],
    ]) {
      fillRect(cx, cy, 2, 4, palette.accentBright);
      setPixel(cx + 2, cy + 1, palette.accentBright);
      setPixel(cx - 1, cy + 2, palette.groundDetail);
    }
  } else if (fieldId === 'volcano') {
    // 화산 분화구 능선 실루엣
    for (const [peakX, peakRadius] of [
      [28, 24],
      [64, 30],
      [104, 22],
    ]) {
      for (let row = 0; row < 12; row += 1) {
        const halfWidth = Math.max(2, peakRadius - row * 2);
        fillRect(
          peakX - halfWidth,
          layout.horizonY - row,
          halfWidth * 2,
          1,
          row > 8 ? palette.horizonMid : palette.horizonDark,
        );
      }
    }
    // 중앙 분화구 마그마 화구와 화산재 불티
    fillRect(60, layout.horizonY - 11, 8, 2, palette.horizonLight);
    fillRect(62, layout.horizonY - 12, 4, 1, palette.accentBright);
    for (const [ex, ey] of [
      [16, 6],
      [42, 10],
      [64, 4],
      [88, 8],
      [114, 5],
    ]) {
      setPixel(ex, ey, palette.accentBright);
      setPixel(ex + 1, ey + 1, palette.platformRim);
    }
    // 용암 균열 줄기
    fillRect(0, layout.horizonY + 4, layout.width, 3, palette.groundDetail);
    fillRect(8, layout.horizonY + 5, layout.width - 16, 1, palette.accentBright);
    fillRect(20, layout.horizonY + 13, layout.width - 40, 2, palette.groundDetail);
    fillRect(28, layout.horizonY + 13, layout.width - 56, 1, palette.accentBright);
  }

  // 4. GBA 스타일 타원형 전투 발판(Platform) 렌더링
  for (const platform of layout.platforms) {
    fillEllipse(platform.cx, platform.cy + 1, platform.rx, platform.ry, palette.platformBorder);
    fillEllipse(platform.cx, platform.cy, platform.rx, platform.ry, palette.platformBorder);
    fillEllipse(
      platform.cx,
      platform.cy,
      Math.max(1, platform.rx - 1),
      Math.max(1, platform.ry - 1),
      palette.platformRim,
    );
    fillEllipse(
      platform.cx,
      platform.cy,
      Math.max(1, platform.rx - 3),
      Math.max(1, platform.ry - 2),
      palette.platformShade,
    );
    fillEllipse(
      platform.cx,
      platform.cy - 1,
      Math.max(1, platform.rx - 4),
      Math.max(1, platform.ry - 3),
      palette.platformInner,
    );
  }

  return buffer;
}

export function drawTerrainToCanvas(
  canvas: HTMLCanvasElement,
  fieldId: BattleFieldId,
  mode: TerrainMode,
): void {
  const layout = getTerrainLayout(mode);
  if (canvas.width !== layout.width) {
    canvas.width = layout.width;
  }
  if (canvas.height !== layout.height) {
    canvas.height = layout.height;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.imageSmoothingEnabled = false;
  const pixels = renderTerrainPixels(fieldId, mode);
  const imageData = new ImageData(new Uint8ClampedArray(pixels), layout.width, layout.height);
  context.putImageData(imageData, 0, 0);
}

function drawCloud(
  fillRect: (x: number, y: number, w: number, h: number, hex: string) => void,
  x: number,
  y: number,
  mainColor: string,
  shadeColor: string,
): void {
  fillRect(x + 2, y, 10, 2, mainColor);
  fillRect(x, y + 2, 14, 2, mainColor);
  fillRect(x + 1, y + 4, 12, 1, shadeColor);
}

function parseHex(hex: string): RgbColor {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
