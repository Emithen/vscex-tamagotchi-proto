#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  applyOperations,
  createProject,
  diffProjects,
  exportProject,
  inspectProject,
  readProject,
  validateProject,
  writeProject,
} from '../core/index.mjs';

try {
  run(process.argv.slice(2));
} catch (cause) {
  const error =
    cause instanceof Error
      ? cause
      : new Error(
          'Sprite Studio CLI 실행 실패: 알 수 없는 원인으로 명령을 완료하지 못했습니다. 입력 인자와 프로젝트 파일을 확인하세요.',
        );
  console.error(error);
  process.exitCode = 1;
}

function run(args) {
  const [command, ...commandArgs] = args;
  switch (command) {
    case 'create':
      create(commandArgs);
      break;
    case 'apply':
      apply(commandArgs);
      break;
    case 'inspect':
      inspect(commandArgs);
      break;
    case 'validate':
      validate(commandArgs);
      break;
    case 'export':
      exportSprite(commandArgs);
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(
        `Sprite Studio CLI 명령 실패: 명령 "${command}"을 지원하지 않습니다. "pnpm sprite-studio help"로 사용 가능한 명령을 확인하세요.`,
      );
  }
}

function create(args) {
  const [projectArgument, ...options] = args;
  if (!projectArgument) {
    throwMissingArgument('create', '<project.json>');
  }
  const id = readOption(options, '--id');
  const width = readNumberOption(options, '--width', 32);
  const height = readNumberOption(options, '--height', 32);
  const projectPath = path.resolve(projectArgument);
  if (fs.existsSync(projectPath)) {
    throw new Error(
      `Sprite Studio 프로젝트 생성 실패: 파일 "${projectPath}"이 이미 존재합니다. 다른 경로를 사용하거나 기존 프로젝트를 편집하세요.`,
    );
  }
  writeProject(projectPath, createProject({ id, width, height }));
  console.log(`Sprite Studio 프로젝트 생성 완료: "${projectPath}"`);
}

function apply(args) {
  const [projectArgument, operationsArgument] = args;
  if (!projectArgument || !operationsArgument) {
    throwMissingArgument('apply', '<project.json> <operations.json|->');
  }
  const projectPath = path.resolve(projectArgument);
  const operationsText = readOperationsText(operationsArgument);
  let operations;
  try {
    operations = JSON.parse(operationsText);
  } catch (cause) {
    throw new Error(
      `Sprite Studio 명령 로드 실패: 입력 "${operationsArgument}"을 JSON으로 읽지 못했습니다. 명령 배열의 JSON 문법을 확인하세요.`,
      { cause },
    );
  }
  const project = readProject(projectPath);
  const nextProject = applyOperations(project, operations);
  const diff = diffProjects(project, nextProject);
  writeProject(projectPath, nextProject);
  console.log(`Sprite Studio 명령 적용 완료: "${projectPath}"`);
  console.log(JSON.stringify({ operationsApplied: operations.length, diff }, null, 2));
}

function readOperationsText(operationsArgument) {
  const target = operationsArgument === '-' ? '표준 입력' : path.resolve(operationsArgument);
  try {
    return operationsArgument === '-'
      ? fs.readFileSync(0, 'utf8')
      : fs.readFileSync(target, 'utf8');
  } catch (cause) {
    throw new Error(
      `Sprite Studio 명령 로드 실패: 대상 "${target}"을 읽지 못했습니다. 파일 경로와 읽기 권한을 확인하세요.`,
      { cause },
    );
  }
}

function inspect(args) {
  const [projectArgument] = args;
  if (!projectArgument) {
    throwMissingArgument('inspect', '<project.json>');
  }
  console.log(JSON.stringify(inspectProject(readProject(path.resolve(projectArgument))), null, 2));
}

function validate(args) {
  const [projectArgument] = args;
  if (!projectArgument) {
    throwMissingArgument('validate', '<project.json>');
  }
  const projectPath = path.resolve(projectArgument);
  validateProject(readProject(projectPath), projectPath);
  console.log(`Sprite Studio 프로젝트 검증 완료: "${projectPath}"`);
}

function exportSprite(args) {
  const [projectArgument, outputArgument] = args;
  if (!projectArgument || !outputArgument) {
    throwMissingArgument('export', '<project.json> <output-directory>');
  }
  const result = exportProject(
    readProject(path.resolve(projectArgument)),
    path.resolve(outputArgument),
  );
  console.log(
    `Sprite Studio 내보내기 완료: PNG "${result.spritePath}", manifest "${result.manifestPath}", 미리보기 "${result.previewPath}"`,
  );
}

function readOption(options, name) {
  const optionIndex = options.indexOf(name);
  const value = optionIndex >= 0 ? options[optionIndex + 1] : undefined;
  if (!value) {
    throw new Error(
      `Sprite Studio CLI 옵션 실패: 필수 옵션 "${name}"의 값을 찾지 못했습니다. 명령 도움말을 확인하세요.`,
    );
  }
  return value;
}

function readNumberOption(options, name, fallback) {
  const optionIndex = options.indexOf(name);
  if (optionIndex < 0) {
    return fallback;
  }
  const value = Number(options[optionIndex + 1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Sprite Studio CLI 옵션 실패: 옵션 "${name}"의 값 "${options[optionIndex + 1]}"이 0보다 큰 정수가 아닙니다. 숫자 값을 확인하세요.`,
    );
  }
  return value;
}

function throwMissingArgument(command, expected) {
  throw new Error(
    `Sprite Studio CLI 인자 실패: 명령 "${command}"에 "${expected}"가 필요합니다. "pnpm sprite-studio help"로 사용법을 확인하세요.`,
  );
}

function printHelp() {
  console.log(`Sprite Studio CLI

사용법:
  pnpm sprite-studio create <project.json> --id <id> [--width 32] [--height 32]
  pnpm sprite-studio apply <project.json> <operations.json|->
  pnpm sprite-studio inspect <project.json>
  pnpm sprite-studio validate <project.json>
  pnpm sprite-studio export <project.json> <output-directory>

지원 작업(op):
  setPaletteColor, setAnchor, addFrame, cloneFrame, setPixel, fillRect, fillEllipse,
  moveRegion, flipRegion, setAnimation`);
}
