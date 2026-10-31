import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const PROJECT_VERSION = 1;
const TRANSPARENT_SYMBOL = '.';

export function createProject({ id, width = 32, height = 32 }) {
  assertIdentifier(id, '프로젝트 ID');
  assertPositiveInteger(width, '캔버스 너비');
  assertPositiveInteger(height, '캔버스 높이');

  return {
    version: PROJECT_VERSION,
    id,
    canvas: { width, height },
    anchor: { x: Math.floor(width / 2), y: height - 1 },
    palette: [],
    frames: [],
    animations: {},
  };
}

export function readProject(projectPath) {
  let document;
  try {
    document = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  } catch (cause) {
    throw new Error(
      `Sprite Studio 프로젝트 로드 실패: 파일 "${projectPath}"을 JSON으로 읽지 못했습니다. 파일 경로와 JSON 문법을 확인하세요.`,
      { cause },
    );
  }
  validateProject(document, projectPath);
  return document;
}

export function writeProject(projectPath, project) {
  validateProject(project, projectPath);
  try {
    fs.mkdirSync(path.dirname(projectPath), { recursive: true });
    fs.writeFileSync(projectPath, `${JSON.stringify(project, null, 2)}\n`);
  } catch (cause) {
    throw new Error(
      `Sprite Studio 프로젝트 저장 실패: 파일 "${projectPath}"에 편집 결과를 저장하지 못했습니다. 디렉터리 권한과 사용 가능한 공간을 확인하세요.`,
      { cause },
    );
  }
}

export function applyOperations(project, operations) {
  if (!Array.isArray(operations)) {
    throw new Error(
      'Sprite Studio 명령 적용 실패: 명령 입력이 JSON 배열이 아닙니다. 각 명령 객체를 배열 안에 작성하세요.',
    );
  }

  const nextProject = structuredClone(project);
  for (const [index, operation] of operations.entries()) {
    try {
      applyOperation(nextProject, operation);
    } catch (cause) {
      throw new Error(
        `Sprite Studio 명령 적용 실패: 인덱스 "${index}"의 명령 "${getOperationName(operation)}"을 처리하지 못했습니다. 명령의 필수 필드와 대상 ID를 확인하세요.`,
        { cause },
      );
    }
  }
  validateProject(nextProject, nextProject.id);
  return nextProject;
}

export function validateProject(project, target = 'project.json') {
  if (!isRecord(project)) {
    throw new Error(
      `Sprite Studio 프로젝트 검증 실패: 대상 "${target}"이 JSON 객체가 아닙니다. 프로젝트 루트 구조를 확인하세요.`,
    );
  }
  if (project.version !== PROJECT_VERSION) {
    throw new Error(
      `Sprite Studio 프로젝트 검증 실패: 대상 "${target}"의 버전 "${project.version}"을 지원하지 않습니다. version을 "${PROJECT_VERSION}"로 맞추세요.`,
    );
  }
  assertIdentifier(project.id, '프로젝트 ID');

  if (!isRecord(project.canvas)) {
    throw new Error(
      `Sprite Studio 프로젝트 검증 실패: 대상 "${target}"에 "canvas" 객체가 없습니다. width와 height를 추가하세요.`,
    );
  }
  assertPositiveInteger(project.canvas.width, '캔버스 너비');
  assertPositiveInteger(project.canvas.height, '캔버스 높이');
  validateAnchor(project.anchor, project.canvas, target);

  if (!Array.isArray(project.palette)) {
    throw new Error(
      `Sprite Studio 팔레트 검증 실패: 대상 "${target}"의 "palette"가 배열이 아닙니다. 팔레트 항목 배열을 추가하세요.`,
    );
  }
  const paletteNames = new Set();
  const paletteSymbols = new Set([TRANSPARENT_SYMBOL]);
  for (const entry of project.palette) {
    validatePaletteEntry(entry, target);
    if (paletteNames.has(entry.name) || paletteSymbols.has(entry.symbol)) {
      throw new Error(
        `Sprite Studio 팔레트 검증 실패: 대상 "${target}"에서 이름 "${entry.name}" 또는 기호 "${entry.symbol}"이 중복되었습니다. 각 팔레트 항목에 고유한 값을 사용하세요.`,
      );
    }
    paletteNames.add(entry.name);
    paletteSymbols.add(entry.symbol);
  }

  if (!Array.isArray(project.frames)) {
    throw new Error(
      `Sprite Studio 프레임 검증 실패: 대상 "${target}"의 "frames"가 배열이 아닙니다. 프레임 배열을 추가하세요.`,
    );
  }
  const frameIds = new Set();
  for (const frame of project.frames) {
    validateFrame(frame, project.canvas, paletteSymbols, target);
    if (frameIds.has(frame.id)) {
      throw new Error(
        `Sprite Studio 프레임 검증 실패: 대상 "${target}"에 프레임 ID "${frame.id}"가 중복되었습니다. 고유한 프레임 ID를 사용하세요.`,
      );
    }
    frameIds.add(frame.id);
  }

  if (!isRecord(project.animations)) {
    throw new Error(
      `Sprite Studio 애니메이션 검증 실패: 대상 "${target}"의 "animations"가 객체가 아닙니다. 애니메이션 설정 객체를 추가하세요.`,
    );
  }
  for (const [name, animation] of Object.entries(project.animations)) {
    assertIdentifier(name, '애니메이션 이름');
    validateAnimation(animation, frameIds, target, name);
  }
}

export function inspectProject(project) {
  validateProject(project, project.id);
  return {
    id: project.id,
    canvas: project.canvas,
    anchor: project.anchor,
    paletteColors: project.palette.length,
    frames: project.frames.map((frame, index) => ({ id: frame.id, index })),
    animations: Object.fromEntries(
      Object.entries(project.animations).map(([name, animation]) => [
        name,
        {
          frameCount: animation.frames.length,
          fps: animation.fps,
          loop: animation.loop,
        },
      ]),
    ),
  };
}

export function diffProjects(before, after) {
  validateProject(before, before.id);
  validateProject(after, after.id);
  if (before.canvas.width !== after.canvas.width || before.canvas.height !== after.canvas.height) {
    throw new Error(
      `Sprite Studio diff 실패: 프로젝트 "${before.id}"와 "${after.id}"의 캔버스 크기가 다릅니다. 같은 크기의 프로젝트를 비교하세요.`,
    );
  }

  const beforeFrames = new Map(before.frames.map((frame) => [frame.id, frame]));
  const afterFrames = new Map(after.frames.map((frame) => [frame.id, frame]));
  const frameIds = new Set([...beforeFrames.keys(), ...afterFrames.keys()]);
  const frames = [];
  let changedPixelCount = 0;

  for (const frameId of frameIds) {
    const beforeFrame = beforeFrames.get(frameId);
    const afterFrame = afterFrames.get(frameId);
    if (!beforeFrame || !afterFrame) {
      const pixelCount = before.canvas.width * before.canvas.height;
      frames.push({
        id: frameId,
        status: beforeFrame ? 'removed' : 'added',
        changedPixels: pixelCount,
      });
      changedPixelCount += pixelCount;
      continue;
    }

    let frameChangedPixels = 0;
    let minX = before.canvas.width;
    let minY = before.canvas.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < before.canvas.height; y += 1) {
      for (let x = 0; x < before.canvas.width; x += 1) {
        if (beforeFrame.pixels[y][x] === afterFrame.pixels[y][x]) {
          continue;
        }
        frameChangedPixels += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (frameChangedPixels > 0) {
      frames.push({
        id: frameId,
        status: 'modified',
        changedPixels: frameChangedPixels,
        bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
      });
      changedPixelCount += frameChangedPixels;
    }
  }

  return {
    changedPixelCount,
    frames,
    paletteChanged: JSON.stringify(before.palette) !== JSON.stringify(after.palette),
    anchorChanged: JSON.stringify(before.anchor) !== JSON.stringify(after.anchor),
    animationsChanged: JSON.stringify(before.animations) !== JSON.stringify(after.animations),
  };
}

export function exportProject(project, outputDirectory) {
  validateProject(project, project.id);
  if (project.frames.length === 0) {
    throw new Error(
      `Sprite Studio 내보내기 실패: 프로젝트 "${project.id}"에 프레임이 없습니다. "addFrame" 명령으로 프레임을 추가하세요.`,
    );
  }
  if (project.palette.length === 0) {
    throw new Error(
      `Sprite Studio 내보내기 실패: 프로젝트 "${project.id}"의 팔레트가 비어 있습니다. "setPaletteColor" 명령으로 한 개 이상의 색상을 추가하세요.`,
    );
  }

  const { width, height } = project.canvas;
  const spriteName = `${project.id}.png`;
  const manifestName = `${project.id}.json`;
  const previewName = `${project.id}-preview.png`;
  const sprite = new PNG({ width: width * project.frames.length, height });
  const paletteBySymbol = new Map(
    project.palette.map((entry) => [entry.symbol, parseHexColor(entry.color)]),
  );

  for (const [frameIndex, frame] of project.frames.entries()) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const symbol = frame.pixels[y][x];
        if (symbol === TRANSPARENT_SYMBOL) {
          continue;
        }
        writePixel(sprite, frameIndex * width + x, y, [...paletteBySymbol.get(symbol), 255]);
      }
    }
  }

  const frameIndexById = new Map(project.frames.map((frame, index) => [frame.id, index]));
  const manifest = {
    version: 1,
    id: project.id,
    image: `./${spriteName}`,
    frame: { width, height, columns: project.frames.length, rows: 1 },
    anchor: project.anchor,
    palette: { maxOpaqueColors: project.palette.length, binaryAlpha: true },
    animations: Object.fromEntries(
      Object.entries(project.animations).map(([name, animation]) => [
        name,
        {
          frames: animation.frames.map((frameId) => frameIndexById.get(frameId)),
          fps: animation.fps,
          loop: animation.loop,
        },
      ]),
    ),
  };

  try {
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(path.join(outputDirectory, spriteName), PNG.sync.write(sprite));
    fs.writeFileSync(
      path.join(outputDirectory, previewName),
      PNG.sync.write(createPreview(project, paletteBySymbol)),
    );
    fs.writeFileSync(
      path.join(outputDirectory, manifestName),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  } catch (cause) {
    throw new Error(
      `Sprite Studio 내보내기 실패: 디렉터리 "${outputDirectory}"에 PNG와 manifest를 저장하지 못했습니다. 디렉터리 권한과 파일 경로를 확인하세요.`,
      { cause },
    );
  }

  return {
    spritePath: path.join(outputDirectory, spriteName),
    manifestPath: path.join(outputDirectory, manifestName),
    previewPath: path.join(outputDirectory, previewName),
  };
}

function applyOperation(project, operation) {
  if (!isRecord(operation) || typeof operation.op !== 'string') {
    throw new Error(
      'Sprite Studio 명령 검증 실패: 명령 객체에 문자열 필드 "op"가 없습니다. 지원되는 작업 이름을 지정하세요.',
    );
  }

  switch (operation.op) {
    case 'setPaletteColor':
      setPaletteColor(project, operation);
      break;
    case 'setAnchor':
      project.anchor = { x: operation.x, y: operation.y };
      break;
    case 'addFrame':
      addFrame(project, operation.id);
      break;
    case 'cloneFrame':
      cloneFrame(project, operation.from, operation.id);
      break;
    case 'setPixel':
      setPixel(project, operation);
      break;
    case 'fillRect':
      fillRect(project, operation);
      break;
    case 'fillEllipse':
      fillEllipse(project, operation);
      break;
    case 'moveRegion':
      moveRegion(project, operation);
      break;
    case 'flipRegion':
      flipRegion(project, operation);
      break;
    case 'setAnimation':
      setAnimation(project, operation);
      break;
    default:
      throw new Error(
        `Sprite Studio 명령 검증 실패: 작업 "${operation.op}"을 지원하지 않습니다. CLI 도움말의 지원 명령을 확인하세요.`,
      );
  }
}

function setPaletteColor(project, operation) {
  validatePaletteEntry(operation, project.id);
  const conflictingEntry = project.palette.find(
    (entry) =>
      (entry.name === operation.name || entry.symbol === operation.symbol) &&
      entry.name !== operation.name,
  );
  if (conflictingEntry) {
    throw new Error(
      `Sprite Studio 팔레트 수정 실패: 기호 "${operation.symbol}"을 팔레트 "${conflictingEntry.name}"이 사용 중입니다. 다른 단일 문자 기호를 선택하세요.`,
    );
  }
  const existingEntry = project.palette.find((entry) => entry.name === operation.name);
  if (existingEntry) {
    const oldSymbol = existingEntry.symbol;
    existingEntry.symbol = operation.symbol;
    existingEntry.color = operation.color.toLowerCase();
    if (oldSymbol !== operation.symbol) {
      replaceFrameSymbol(project.frames, oldSymbol, operation.symbol);
    }
    return;
  }
  project.palette.push({
    name: operation.name,
    symbol: operation.symbol,
    color: operation.color.toLowerCase(),
  });
}

function addFrame(project, frameId) {
  assertIdentifier(frameId, '프레임 ID');
  if (findFrame(project, frameId)) {
    throw new Error(
      `Sprite Studio 프레임 추가 실패: 프레임 "${frameId}"가 이미 존재합니다. 고유한 프레임 ID를 사용하세요.`,
    );
  }
  project.frames.push({
    id: frameId,
    pixels: Array.from({ length: project.canvas.height }, () =>
      TRANSPARENT_SYMBOL.repeat(project.canvas.width),
    ),
  });
}

function cloneFrame(project, sourceId, frameId) {
  assertIdentifier(frameId, '프레임 ID');
  const source = requireFrame(project, sourceId);
  if (findFrame(project, frameId)) {
    throw new Error(
      `Sprite Studio 프레임 복제 실패: 대상 프레임 "${frameId}"가 이미 존재합니다. 고유한 프레임 ID를 사용하세요.`,
    );
  }
  project.frames.push({ id: frameId, pixels: [...source.pixels] });
}

function setPixel(project, operation) {
  const frame = requireFrame(project, operation.frame);
  assertCanvasPoint(project.canvas, operation.x, operation.y, operation.frame);
  const symbol = resolveColorSymbol(project, operation.color);
  frame.pixels[operation.y] = replaceCharacter(frame.pixels[operation.y], operation.x, symbol);
}

function fillRect(project, operation) {
  const frame = requireFrame(project, operation.frame);
  assertRegion(project.canvas, operation, operation.frame);
  const symbol = resolveColorSymbol(project, operation.color);
  for (let y = operation.y; y < operation.y + operation.height; y += 1) {
    let row = frame.pixels[y];
    for (let x = operation.x; x < operation.x + operation.width; x += 1) {
      row = replaceCharacter(row, x, symbol);
    }
    frame.pixels[y] = row;
  }
}

function fillEllipse(project, operation) {
  const frame = requireFrame(project, operation.frame);
  assertRegion(project.canvas, operation, operation.frame);
  const symbol = resolveColorSymbol(project, operation.color);
  const radiusX = operation.width / 2;
  const radiusY = operation.height / 2;

  for (let localY = 0; localY < operation.height; localY += 1) {
    let row = frame.pixels[operation.y + localY];
    for (let localX = 0; localX < operation.width; localX += 1) {
      const normalizedX = (localX + 0.5 - radiusX) / radiusX;
      const normalizedY = (localY + 0.5 - radiusY) / radiusY;
      if (normalizedX ** 2 + normalizedY ** 2 <= 1) {
        row = replaceCharacter(row, operation.x + localX, symbol);
      }
    }
    frame.pixels[operation.y + localY] = row;
  }
}

function moveRegion(project, operation) {
  const frame = requireFrame(project, operation.frame);
  assertRegion(project.canvas, operation, operation.frame);
  if (!Number.isInteger(operation.dx) || !Number.isInteger(operation.dy)) {
    throw new Error(
      `Sprite Studio 영역 이동 실패: 프레임 "${operation.frame}"의 이동량 "${operation.dx},${operation.dy}"가 정수가 아닙니다. 정수 dx와 dy를 사용하세요.`,
    );
  }
  assertCanvasPoint(
    project.canvas,
    operation.x + operation.dx,
    operation.y + operation.dy,
    operation.frame,
  );
  assertCanvasPoint(
    project.canvas,
    operation.x + operation.dx + operation.width - 1,
    operation.y + operation.dy + operation.height - 1,
    operation.frame,
  );

  const sourceRows = frame.pixels.map((row) => [...row]);
  const nextRows = frame.pixels.map((row) => [...row]);
  for (let y = operation.y; y < operation.y + operation.height; y += 1) {
    for (let x = operation.x; x < operation.x + operation.width; x += 1) {
      nextRows[y][x] = TRANSPARENT_SYMBOL;
    }
  }
  for (let localY = 0; localY < operation.height; localY += 1) {
    for (let localX = 0; localX < operation.width; localX += 1) {
      nextRows[operation.y + operation.dy + localY][operation.x + operation.dx + localX] =
        sourceRows[operation.y + localY][operation.x + localX];
    }
  }
  frame.pixels = nextRows.map((row) => row.join(''));
}

function flipRegion(project, operation) {
  const frame = requireFrame(project, operation.frame);
  assertRegion(project.canvas, operation, operation.frame);
  if (operation.axis !== 'x' && operation.axis !== 'y') {
    throw new Error(
      `Sprite Studio 영역 반전 실패: 프레임 "${operation.frame}"의 축 "${operation.axis}"을 지원하지 않습니다. axis에 "x" 또는 "y"를 사용하세요.`,
    );
  }

  const sourceRows = frame.pixels.map((row) => [...row]);
  const nextRows = frame.pixels.map((row) => [...row]);
  for (let localY = 0; localY < operation.height; localY += 1) {
    for (let localX = 0; localX < operation.width; localX += 1) {
      const sourceX = operation.axis === 'x' ? operation.width - localX - 1 : localX;
      const sourceY = operation.axis === 'y' ? operation.height - localY - 1 : localY;
      nextRows[operation.y + localY][operation.x + localX] =
        sourceRows[operation.y + sourceY][operation.x + sourceX];
    }
  }
  frame.pixels = nextRows.map((row) => row.join(''));
}

function setAnimation(project, operation) {
  assertIdentifier(operation.name, '애니메이션 이름');
  if (!Array.isArray(operation.frames) || operation.frames.length === 0) {
    throw new Error(
      `Sprite Studio 애니메이션 수정 실패: 애니메이션 "${operation.name}"에 한 개 이상의 프레임 ID가 필요합니다. frames 배열을 확인하세요.`,
    );
  }
  for (const frameId of operation.frames) {
    requireFrame(project, frameId);
  }
  if (typeof operation.fps !== 'number' || !Number.isFinite(operation.fps) || operation.fps <= 0) {
    throw new Error(
      `Sprite Studio 애니메이션 수정 실패: 애니메이션 "${operation.name}"의 fps가 0보다 큰 유한수가 아닙니다. fps 값을 확인하세요.`,
    );
  }
  if (typeof operation.loop !== 'boolean') {
    throw new Error(
      `Sprite Studio 애니메이션 수정 실패: 애니메이션 "${operation.name}"의 loop가 boolean이 아닙니다. true 또는 false를 사용하세요.`,
    );
  }
  project.animations[operation.name] = {
    frames: [...operation.frames],
    fps: operation.fps,
    loop: operation.loop,
  };
}

function validatePaletteEntry(entry, target) {
  if (!isRecord(entry)) {
    throw new Error(
      `Sprite Studio 팔레트 검증 실패: 대상 "${target}"에 객체가 아닌 팔레트 항목이 있습니다. name, symbol, color를 지정하세요.`,
    );
  }
  assertIdentifier(entry.name, '팔레트 이름');
  if (
    typeof entry.symbol !== 'string' ||
    entry.symbol.length !== 1 ||
    entry.symbol === TRANSPARENT_SYMBOL ||
    /\s/u.test(entry.symbol)
  ) {
    throw new Error(
      `Sprite Studio 팔레트 검증 실패: 대상 "${target}"의 팔레트 "${entry.name}" 기호가 유효하지 않습니다. "."과 공백을 제외한 단일 문자를 사용하세요.`,
    );
  }
  if (typeof entry.color !== 'string' || !/^#[0-9a-f]{6}$/iu.test(entry.color)) {
    throw new Error(
      `Sprite Studio 팔레트 검증 실패: 대상 "${target}"의 팔레트 "${entry.name}" 색상 "${entry.color}"이 유효하지 않습니다. "#RRGGBB" 형식을 사용하세요.`,
    );
  }
}

function validateAnchor(anchor, canvas, target) {
  if (
    !isRecord(anchor) ||
    !Number.isInteger(anchor.x) ||
    !Number.isInteger(anchor.y) ||
    anchor.x < 0 ||
    anchor.x >= canvas.width ||
    anchor.y < 0 ||
    anchor.y >= canvas.height
  ) {
    throw new Error(
      `Sprite Studio 기준점 검증 실패: 대상 "${target}"의 anchor가 ${canvas.width}×${canvas.height} 캔버스 범위를 벗어났습니다. 정수 좌표 x와 y를 확인하세요.`,
    );
  }
}

function validateFrame(frame, canvas, paletteSymbols, target) {
  if (!isRecord(frame)) {
    throw new Error(
      `Sprite Studio 프레임 검증 실패: 대상 "${target}"에 객체가 아닌 프레임이 있습니다. id와 pixels를 지정하세요.`,
    );
  }
  assertIdentifier(frame.id, '프레임 ID');
  if (!Array.isArray(frame.pixels) || frame.pixels.length !== canvas.height) {
    throw new Error(
      `Sprite Studio 프레임 검증 실패: 프레임 "${frame.id}"의 행 수가 캔버스 높이 ${canvas.height}와 다릅니다. pixels 행 수를 맞추세요.`,
    );
  }
  for (const [rowIndex, row] of frame.pixels.entries()) {
    if (typeof row !== 'string' || [...row].length !== canvas.width) {
      throw new Error(
        `Sprite Studio 프레임 검증 실패: 프레임 "${frame.id}"의 행 "${rowIndex}" 너비가 캔버스 너비 ${canvas.width}와 다릅니다. 행의 문자 수를 맞추세요.`,
      );
    }
    for (const symbol of row) {
      if (!paletteSymbols.has(symbol)) {
        throw new Error(
          `Sprite Studio 프레임 검증 실패: 프레임 "${frame.id}"에서 팔레트에 없는 기호 "${symbol}"을 찾았습니다. palette에 색상을 추가하거나 픽셀 기호를 수정하세요.`,
        );
      }
    }
  }
}

function validateAnimation(animation, frameIds, target, name) {
  if (!isRecord(animation) || !Array.isArray(animation.frames) || animation.frames.length === 0) {
    throw new Error(
      `Sprite Studio 애니메이션 검증 실패: 대상 "${target}"의 애니메이션 "${name}"에 프레임 배열이 없습니다. 한 개 이상의 프레임 ID를 추가하세요.`,
    );
  }
  for (const frameId of animation.frames) {
    if (!frameIds.has(frameId)) {
      throw new Error(
        `Sprite Studio 애니메이션 검증 실패: 애니메이션 "${name}"이 없는 프레임 "${frameId}"을 참조합니다. frames 목록을 확인하세요.`,
      );
    }
  }
  if (typeof animation.fps !== 'number' || !Number.isFinite(animation.fps) || animation.fps <= 0) {
    throw new Error(
      `Sprite Studio 애니메이션 검증 실패: 애니메이션 "${name}"의 fps가 유효하지 않습니다. 0보다 큰 유한수를 사용하세요.`,
    );
  }
  if (typeof animation.loop !== 'boolean') {
    throw new Error(
      `Sprite Studio 애니메이션 검증 실패: 애니메이션 "${name}"의 loop가 boolean이 아닙니다. true 또는 false를 사용하세요.`,
    );
  }
}

function requireFrame(project, frameId) {
  const frame = findFrame(project, frameId);
  if (!frame) {
    throw new Error(
      `Sprite Studio 프레임 조회 실패: 프로젝트 "${project.id}"에서 프레임 "${frameId}"을 찾지 못했습니다. 프레임 ID를 확인하거나 "addFrame" 명령으로 추가하세요.`,
    );
  }
  return frame;
}

function findFrame(project, frameId) {
  return project.frames.find((frame) => frame.id === frameId);
}

function resolveColorSymbol(project, colorName) {
  if (colorName === 'transparent') {
    return TRANSPARENT_SYMBOL;
  }
  const entry = project.palette.find((candidate) => candidate.name === colorName);
  if (!entry) {
    throw new Error(
      `Sprite Studio 색상 조회 실패: 프로젝트 "${project.id}"의 팔레트에서 색상 "${colorName}"을 찾지 못했습니다. "setPaletteColor" 명령으로 색상을 추가하세요.`,
    );
  }
  return entry.symbol;
}

function assertCanvasPoint(canvas, x, y, frameId) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= canvas.width ||
    y < 0 ||
    y >= canvas.height
  ) {
    throw new Error(
      `Sprite Studio 좌표 검증 실패: 프레임 "${frameId}"의 좌표 "${x},${y}"가 ${canvas.width}×${canvas.height} 캔버스 범위를 벗어났습니다. 0부터 시작하는 정수 좌표를 사용하세요.`,
    );
  }
}

function assertRegion(canvas, region, frameId) {
  assertPositiveInteger(region.width, '영역 너비');
  assertPositiveInteger(region.height, '영역 높이');
  assertCanvasPoint(canvas, region.x, region.y, frameId);
  assertCanvasPoint(canvas, region.x + region.width - 1, region.y + region.height - 1, frameId);
}

function createPreview(project, paletteBySymbol) {
  const scale = 8;
  const gap = 1;
  const frameWidth = project.canvas.width;
  const frameHeight = project.canvas.height;
  const logicalWidth = project.frames.length * frameWidth + (project.frames.length + 1) * gap;
  const logicalHeight = frameHeight + gap * 2;
  const preview = new PNG({ width: logicalWidth * scale, height: logicalHeight * scale });
  const backgroundColors = [
    [210, 210, 210, 255],
    [238, 238, 238, 255],
  ];
  const borderColor = [80, 80, 80, 255];

  for (let logicalY = 0; logicalY < logicalHeight; logicalY += 1) {
    for (let logicalX = 0; logicalX < logicalWidth; logicalX += 1) {
      fillPreviewPixel(preview, logicalX, logicalY, scale, borderColor);
    }
  }

  for (const [frameIndex, frame] of project.frames.entries()) {
    const frameLeft = gap + frameIndex * (frameWidth + gap);
    for (let y = 0; y < frameHeight; y += 1) {
      for (let x = 0; x < frameWidth; x += 1) {
        const symbol = frame.pixels[y][x];
        const color =
          symbol === TRANSPARENT_SYMBOL
            ? backgroundColors[(Math.floor(x / 2) + Math.floor(y / 2)) % 2]
            : [...paletteBySymbol.get(symbol), 255];
        fillPreviewPixel(preview, frameLeft + x, gap + y, scale, color);
      }
    }
  }
  return preview;
}

function fillPreviewPixel(png, logicalX, logicalY, scale, color) {
  for (let offsetY = 0; offsetY < scale; offsetY += 1) {
    for (let offsetX = 0; offsetX < scale; offsetX += 1) {
      writePixel(png, logicalX * scale + offsetX, logicalY * scale + offsetY, color);
    }
  }
}

function replaceFrameSymbol(frames, oldSymbol, newSymbol) {
  for (const frame of frames) {
    frame.pixels = frame.pixels.map((row) => row.split(oldSymbol).join(newSymbol));
  }
}

function replaceCharacter(row, index, character) {
  return `${row.slice(0, index)}${character}${row.slice(index + 1)}`;
}

function parseHexColor(color) {
  return [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
}

function writePixel(png, x, y, pixel) {
  const offset = (y * png.width + x) * 4;
  for (let channel = 0; channel < 4; channel += 1) {
    png.data[offset + channel] = pixel[channel];
  }
}

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/u.test(value)) {
    throw new Error(
      `Sprite Studio 식별자 검증 실패: ${label} "${value}"이 유효하지 않습니다. 영문 소문자, 숫자, "-", "_"만 사용하세요.`,
    );
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Sprite Studio 숫자 검증 실패: ${label} "${value}"이 0보다 큰 정수가 아닙니다. 값을 확인하세요.`,
    );
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getOperationName(operation) {
  return isRecord(operation) && typeof operation.op === 'string' ? operation.op : 'unknown';
}
