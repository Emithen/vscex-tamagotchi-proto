import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const FRAME_COUNT = 4;
const FRAME_SIZE = 32;
const CONTENT_SIZE = 30;
const ALPHA_THRESHOLD = 128;

try {
  const [inputArgument, outputArgument, paletteArgument] = process.argv
    .slice(2)
    .filter((argument) => argument !== '--');
  if (!inputArgument || !outputArgument || !paletteArgument) {
    throw new Error(
      '픽셀 시트 정규화 실패: 입력 PNG, 출력 PNG, 팔레트 JSON 경로가 필요합니다. "pnpm run normalize:pixel-sheet -- <input> <output> <palette>"를 사용하세요.',
    );
  }

  normalizeSheet(inputArgument, outputArgument, paletteArgument);
} catch (cause) {
  const error =
    cause instanceof Error
      ? cause
      : new Error(
          '픽셀 시트 정규화 실패: 알 수 없는 원인으로 스프라이트를 생성하지 못했습니다. 입력 이미지와 팔레트 파일을 확인하세요.',
        );
  console.error(error);
  process.exitCode = 1;
}

function normalizeSheet(inputArgument, outputArgument, paletteArgument) {
  const inputPath = path.resolve(inputArgument);
  const outputPath = path.resolve(outputArgument);
  const palettePath = path.resolve(paletteArgument);
  const input = readPng(inputPath, '입력');
  const palette = readPalette(palettePath);

  if (input.width % FRAME_COUNT !== 0) {
    throw new Error(
      `픽셀 시트 분할 실패: 이미지 "${inputArgument}"의 너비 ${input.width}px를 ${FRAME_COUNT}개 프레임으로 균등하게 나눌 수 없습니다. 수평 ${FRAME_COUNT}프레임 시트인지 확인하세요.`,
    );
  }

  const output = new PNG({ width: FRAME_SIZE * FRAME_COUNT, height: FRAME_SIZE });
  const sourceFrameWidth = input.width / FRAME_COUNT;

  for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
    const bounds = findOpaqueBounds(input, frameIndex * sourceFrameWidth, sourceFrameWidth);
    if (!bounds) {
      throw new Error(
        `픽셀 시트 프레임 정규화 실패: 이미지 "${inputArgument}"의 프레임 "${frameIndex}"에서 불투명 픽셀을 찾지 못했습니다. 알파 채널과 프레임 배치를 확인하세요.`,
      );
    }
    drawNormalizedFrame(input, output, bounds, frameIndex, palette);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, PNG.sync.write(output, { colorType: 6 }));
  console.log(
    `픽셀 시트 정규화 완료: "${outputArgument}"에 ${FRAME_SIZE}×${FRAME_SIZE}px ${FRAME_COUNT}프레임을 저장했습니다.`,
  );
}

function readPng(filePath, operation) {
  try {
    return PNG.sync.read(fs.readFileSync(filePath));
  } catch (cause) {
    throw new Error(
      `픽셀 시트 ${operation} PNG 로드 실패: 파일 "${filePath}"을 읽지 못했습니다. 경로와 PNG 파일 손상 여부를 확인하세요.`,
      { cause },
    );
  }
}

function readPalette(palettePath) {
  let paletteDocument;
  try {
    paletteDocument = JSON.parse(fs.readFileSync(palettePath, 'utf8'));
  } catch (cause) {
    throw new Error(
      `픽셀 시트 팔레트 로드 실패: 파일 "${palettePath}"을 JSON으로 읽지 못했습니다. JSON 문법과 파일 경로를 확인하세요.`,
      { cause },
    );
  }

  if (!Array.isArray(paletteDocument.colors) || paletteDocument.colors.length === 0) {
    throw new Error(
      `픽셀 시트 팔레트 검증 실패: 파일 "${palettePath}"에 색상 목록 "colors"가 없습니다. "#RRGGBB" 형식의 색상을 추가하세요.`,
    );
  }

  return paletteDocument.colors.map((color) => parseHexColor(color, palettePath));
}

function parseHexColor(color, palettePath) {
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error(
      `픽셀 시트 팔레트 검증 실패: 파일 "${palettePath}"의 색상 "${color}"이 "#RRGGBB" 형식이 아닙니다. 6자리 16진수 색상을 사용하세요.`,
    );
  }
  return [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
}

function findOpaqueBounds(input, frameLeft, frameWidth) {
  let minX = frameLeft + frameWidth;
  let minY = input.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < input.height; y += 1) {
    for (let x = frameLeft; x < frameLeft + frameWidth; x += 1) {
      if (readPixel(input, x, y)[3] < ALPHA_THRESHOLD) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return maxX < minX ? undefined : { minX, minY, maxX, maxY };
}

function drawNormalizedFrame(input, output, bounds, frameIndex, palette) {
  const sourceWidth = bounds.maxX - bounds.minX + 1;
  const sourceHeight = bounds.maxY - bounds.minY + 1;
  const scale = Math.min(CONTENT_SIZE / sourceWidth, CONTENT_SIZE / sourceHeight);
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
  const targetLeft = frameIndex * FRAME_SIZE + Math.floor((FRAME_SIZE - targetWidth) / 2);
  const targetTop = Math.floor((FRAME_SIZE - targetHeight) / 2);

  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = bounds.minX + Math.floor((targetX * sourceWidth) / targetWidth);
      const sourceY = bounds.minY + Math.floor((targetY * sourceHeight) / targetHeight);
      const sourcePixel = readPixel(input, sourceX, sourceY);
      if (sourcePixel[3] < ALPHA_THRESHOLD) {
        continue;
      }
      const [red, green, blue] = findNearestColor(sourcePixel, palette);
      writePixel(output, targetLeft + targetX, targetTop + targetY, [red, green, blue, 255]);
    }
  }
}

function findNearestColor(sourcePixel, palette) {
  let nearest = palette[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of palette) {
    const distance =
      (sourcePixel[0] - candidate[0]) ** 2 +
      (sourcePixel[1] - candidate[1]) ** 2 +
      (sourcePixel[2] - candidate[2]) ** 2;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function readPixel(png, x, y) {
  const offset = (y * png.width + x) * 4;
  return [png.data[offset], png.data[offset + 1], png.data[offset + 2], png.data[offset + 3]];
}

function writePixel(png, x, y, pixel) {
  const offset = (y * png.width + x) * 4;
  for (let channel = 0; channel < 4; channel += 1) {
    png.data[offset + channel] = pixel[channel];
  }
}
