import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PNG } from 'pngjs';
import {
  applyOperations,
  createProject,
  diffProjects,
  exportProject,
  inspectProject,
  readProject,
  writeProject,
} from '../core/index.mjs';

test('구조화된 명령으로 프로젝트를 편집하고 PNG와 manifest를 내보낸다', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sprite-studio-'));
  const projectPath = path.join(temporaryRoot, 'project.json');
  const outputDirectory = path.join(temporaryRoot, 'output');
  const project = applyOperations(createProject({ id: 'test-pet', width: 4, height: 4 }), [
    { op: 'setPaletteColor', name: 'outline', symbol: 'O', color: '#010f3d' },
    { op: 'setPaletteColor', name: 'body', symbol: 'B', color: '#66c2c6' },
    { op: 'setAnchor', x: 2, y: 3 },
    { op: 'addFrame', id: 'idle-0' },
    { op: 'fillRect', frame: 'idle-0', x: 1, y: 1, width: 2, height: 2, color: 'body' },
    { op: 'setPixel', frame: 'idle-0', x: 1, y: 1, color: 'outline' },
    { op: 'cloneFrame', from: 'idle-0', id: 'idle-1' },
    {
      op: 'setAnimation',
      name: 'idle',
      frames: ['idle-0', 'idle-1'],
      fps: 4,
      loop: true,
    },
  ]);

  writeProject(projectPath, project);
  const loadedProject = readProject(projectPath);
  const result = exportProject(loadedProject, outputDirectory);
  const sprite = PNG.sync.read(fs.readFileSync(result.spritePath));
  const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));

  assert.equal(sprite.width, 8);
  assert.equal(sprite.height, 4);
  assert.equal(PNG.sync.read(fs.readFileSync(result.previewPath)).width, 88);
  assert.deepEqual(manifest.anchor, { x: 2, y: 3 });
  assert.deepEqual(manifest.animations.idle.frames, [0, 1]);
  assert.equal(readAlpha(sprite, 0, 0), 0);
  assert.deepEqual(readPixel(sprite, 1, 1), [1, 15, 61, 255]);
  assert.deepEqual(readPixel(sprite, 2, 2), [102, 194, 198, 255]);
  assert.equal(inspectProject(loadedProject).frames.length, 2);
});

test('영역을 이동하고 반전한 뒤 픽셀 diff를 반환한다', () => {
  const base = applyOperations(createProject({ id: 'test-pet', width: 4, height: 4 }), [
    { op: 'setPaletteColor', name: 'body', symbol: 'B', color: '#66c2c6' },
    { op: 'addFrame', id: 'idle-0' },
    { op: 'setPixel', frame: 'idle-0', x: 0, y: 0, color: 'body' },
    { op: 'setPixel', frame: 'idle-0', x: 1, y: 0, color: 'body' },
  ]);
  const moved = applyOperations(base, [
    {
      op: 'moveRegion',
      frame: 'idle-0',
      x: 0,
      y: 0,
      width: 2,
      height: 1,
      dx: 1,
      dy: 1,
    },
    { op: 'flipRegion', frame: 'idle-0', x: 0, y: 0, width: 4, height: 4, axis: 'x' },
  ]);
  const diff = diffProjects(base, moved);

  assert.equal(moved.frames[0].pixels[1], '.BB.');
  assert.equal(diff.changedPixelCount, 4);
  assert.deepEqual(diff.frames[0].bounds, { x: 0, y: 0, width: 3, height: 2 });
});

test('타원 도형을 픽셀 격자에 채운다', () => {
  const project = applyOperations(createProject({ id: 'test-pet', width: 6, height: 6 }), [
    { op: 'setPaletteColor', name: 'body', symbol: 'B', color: '#66c2c6' },
    { op: 'addFrame', id: 'idle-0' },
    {
      op: 'fillEllipse',
      frame: 'idle-0',
      x: 1,
      y: 1,
      width: 4,
      height: 4,
      color: 'body',
    },
  ]);

  assert.deepEqual(project.frames[0].pixels, [
    '......',
    '..BB..',
    '.BBBB.',
    '.BBBB.',
    '..BB..',
    '......',
  ]);
});

test('팔레트에 없는 색상을 사용하는 명령을 거부한다', () => {
  const project = applyOperations(createProject({ id: 'test-pet' }), [
    { op: 'addFrame', id: 'idle-0' },
  ]);

  assert.throws(
    () =>
      applyOperations(project, [{ op: 'setPixel', frame: 'idle-0', x: 0, y: 0, color: 'missing' }]),
    /Sprite Studio 명령 적용 실패/u,
  );
});

function readPixel(png, x, y) {
  const offset = (y * png.width + x) * 4;
  return [...png.data.subarray(offset, offset + 4)];
}

function readAlpha(png, x, y) {
  return readPixel(png, x, y)[3];
}
