import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestRoot = path.join(projectRoot, 'media', 'pixel', 'manifests');

try {
  validatePixelAssets();
} catch (cause) {
  const error =
    cause instanceof Error
      ? cause
      : new Error(
          '픽셀 에셋 검증 실패: 알 수 없는 원인으로 검증을 완료하지 못했습니다. "scripts/validate-pixel-assets.mjs"의 입력과 에셋 경로를 확인하세요.',
        );
  console.error(error);
  process.exitCode = 1;
}

function validatePixelAssets() {
  const manifestFiles = fs
    .readdirSync(manifestRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(manifestRoot, entry.name));

  if (manifestFiles.length === 0) {
    throw new Error(
      '픽셀 에셋 manifest 검증 실패: "media/pixel/manifests" 디렉터리에 JSON manifest를 찾지 못했습니다. 스프라이트 manifest를 추가하세요.',
    );
  }

  for (const manifestFile of manifestFiles) {
    validateManifest(manifestFile);
  }

  console.log(`픽셀 에셋 검증 완료: manifest ${manifestFiles.length}개가 규격을 충족합니다.`);
}

function validateManifest(manifestFile) {
  const manifestName = path.relative(projectRoot, manifestFile);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch (cause) {
    throw new Error(
      `픽셀 에셋 manifest 파싱 실패: "${manifestName}"을 JSON으로 읽지 못했습니다. JSON 문법과 파일 인코딩을 확인하세요.`,
      { cause },
    );
  }

  assertPositiveInteger(manifest.version, manifestName, 'version');
  assertNonEmptyString(manifest.id, manifestName, 'id');
  assertNonEmptyString(manifest.image, manifestName, 'image');

  const frame = manifest.frame;
  if (typeof frame !== 'object' || frame === null) {
    throwManifestError(manifestName, 'frame', '프레임 규격 객체를 추가하세요.');
  }
  assertPositiveInteger(frame.width, manifestName, 'frame.width');
  assertPositiveInteger(frame.height, manifestName, 'frame.height');
  assertPositiveInteger(frame.columns, manifestName, 'frame.columns');
  assertPositiveInteger(frame.rows, manifestName, 'frame.rows');

  const imagePath = path.resolve(path.dirname(manifestFile), manifest.image);
  if (!fs.existsSync(imagePath)) {
    throw new Error(
      `픽셀 에셋 이미지 검증 실패: manifest "${manifestName}"이 참조한 이미지 "${manifest.image}"을 찾지 못했습니다. "image" 경로와 스프라이트 파일을 확인하세요.`,
    );
  }

  const png = PNG.sync.read(fs.readFileSync(imagePath));
  const expectedWidth = frame.width * frame.columns;
  const expectedHeight = frame.height * frame.rows;
  if (png.width !== expectedWidth || png.height !== expectedHeight) {
    throw new Error(
      `픽셀 에셋 크기 검증 실패: 이미지 "${manifest.image}"의 크기가 ${png.width}×${png.height}px로 기대한 ${expectedWidth}×${expectedHeight}px과 다릅니다. manifest의 "frame"과 스프라이트 시트 크기를 맞추세요.`,
    );
  }

  validatePixels(png, manifest, manifestName);
  validateAnimations(manifest.animations, frame.columns * frame.rows, manifestName);
}

function validatePixels(png, manifest, manifestName) {
  const opaqueColors = new Set();
  const invalidAlphaValues = new Set();

  for (let offset = 0; offset < png.data.length; offset += 4) {
    const alpha = png.data[offset + 3];
    if (manifest.palette?.binaryAlpha === true && alpha !== 0 && alpha !== 255) {
      invalidAlphaValues.add(alpha);
    }
    if (alpha === 255) {
      opaqueColors.add(`${png.data[offset]},${png.data[offset + 1]},${png.data[offset + 2]}`);
    }
  }

  if (invalidAlphaValues.size > 0) {
    throw new Error(
      `픽셀 에셋 투명도 검증 실패: manifest "${manifestName}"의 이미지에 반투명 알파값 "${[...invalidAlphaValues].join(', ')}"이 있습니다. 알파값을 "0"또는 "255"로 정규화하세요.`,
    );
  }

  const maxOpaqueColors = manifest.palette?.maxOpaqueColors;
  assertPositiveInteger(maxOpaqueColors, manifestName, 'palette.maxOpaqueColors');
  if (opaqueColors.size > maxOpaqueColors) {
    throw new Error(
      `픽셀 에셋 팔레트 검증 실패: manifest "${manifestName}"의 이미지가 불투명 색상 ${opaqueColors.size}개를 사용해 상한 ${maxOpaqueColors}개를 초과했습니다. 팔레트를 줄이거나 manifest 상한을 검토하세요.`,
    );
  }
}

function validateAnimations(animations, frameCount, manifestName) {
  if (typeof animations !== 'object' || animations === null) {
    throwManifestError(manifestName, 'animations', '애니메이션 설정을 추가하세요.');
  }

  for (const [animationName, animation] of Object.entries(animations)) {
    if (!Array.isArray(animation.frames) || animation.frames.length === 0) {
      throwManifestError(
        manifestName,
        `animations.${animationName}.frames`,
        '한 개 이상의 프레임 인덱스를 추가하세요.',
      );
    }
    for (const frameIndex of animation.frames) {
      if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= frameCount) {
        throwManifestError(
          manifestName,
          `animations.${animationName}.frames`,
          `"0"부터 "${frameCount - 1}"까지의 프레임 인덱스를 사용하세요.`,
        );
      }
    }
    if (
      typeof animation.fps !== 'number' ||
      !Number.isFinite(animation.fps) ||
      animation.fps <= 0
    ) {
      throwManifestError(
        manifestName,
        `animations.${animationName}.fps`,
        '0보다 큰 유한수를 사용하세요.',
      );
    }
    if (typeof animation.loop !== 'boolean') {
      throwManifestError(
        manifestName,
        `animations.${animationName}.loop`,
        'boolean 값을 사용하세요.',
      );
    }
  }
}

function assertPositiveInteger(value, manifestName, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throwManifestError(manifestName, fieldName, '0보다 큰 정수를 사용하세요.');
  }
}

function assertNonEmptyString(value, manifestName, fieldName) {
  if (typeof value !== 'string' || value.length === 0) {
    throwManifestError(manifestName, fieldName, '빈 문자열이 아닌 값을 사용하세요.');
  }
}

function throwManifestError(manifestName, fieldName, action) {
  throw new Error(
    `픽셀 에셋 manifest 검증 실패: "${manifestName}"의 "${fieldName}" 값이 유효하지 않습니다. ${action}`,
  );
}
