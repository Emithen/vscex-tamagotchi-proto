# 개발 가이드

## 준비

- VS Code `1.140.0` 이상
- Node.js와 `pnpm`

의존성을 설치합니다.

```sh
pnpm install
```

## 실행과 디버깅

VS Code에서 저장소를 열고 `F5`를 누릅니다. `Run Extension` 실행 구성이 Extension TypeScript 감시 작업과 Webview Vite 빌드 감시 작업을 함께 시작한 뒤 Extension Development Host를 엽니다. Webview 코드를 고친 뒤에는 Extension Development Host에서 View를 다시 열거나 `Developer: Reload Webviews`를 실행합니다.

새 창의 Activity Bar에서 `Tamagotchi`를 선택하면 펫 화면을 확인할 수 있습니다.

Command Palette에서 `Tamagotchi (개발): 포만감 설정`을 실행하면 포만감을 `0~10` 사이의 정수로 직접 바꿀 수 있습니다.

### Webview 브라우저 개발 모드

```sh
pnpm run dev:webview
```

VS Code 없이 브라우저에서 Webview 앱을 HMR로 확인합니다. Extension Host 대신 `webview/src/dev/mock-host.ts`가 메모리 상태로 응답하며, `http://localhost:5173/?fullness=2`처럼 초기 포만감을 지정할 수 있습니다. VS Code 테마 변수는 `webview/src/dev/vscode-theme.css`가 Dark Modern 값으로 흉내 냅니다. 최종 확인은 Extension Development Host에서 합니다.

### Pixel Perfect 수동 검수

Tamagotchi View의 너비와 높이를 바꾸며 다음 배율 전환을 확인합니다.

- 기본: 144×216 논리 화면의 1× 표시
- 288×448 CSS px 이상: 2× 표시
- 432×664 CSS px 이상: 3× 표시

배율 전환 시 화면이 매끄럽게 늘어나지 않고 정수 단계로 바뀌는지, 홈·스테이지·전투·결과 화면의 컨텐츠가 잘리지 않는지, Tab으로 모든 버튼에 이동할 수 있는지를 함께 확인합니다. 상세 규격은 `docs/pixel-perfect.md`를 따릅니다.

## 주요 명령

```sh
pnpm run compile       # Extension 컴파일과 Webview 빌드
pnpm run compile:extension # Extension TypeScript만 컴파일
pnpm run build:webview # Webview 타입 검사와 Vite 빌드 (dist/webview)
pnpm run watch         # Extension TypeScript 변경 감시
pnpm run watch:webview # Webview 변경 감시 빌드
pnpm run dev:webview   # 브라우저 mock 개발 서버
pnpm run test:webview  # Webview 순수 모듈 Vitest 검사
pnpm run lint          # Extension, Webview, Sprite Studio 린트
pnpm run validate:pixel-assets # 스프라이트 크기·팔레트·투명도 검사
pnpm run normalize:pixel-sheet -- <input> <output> <palette> # 생성 시트 48×48px 정규화
pnpm sprite-studio help # 사람과 AI가 함께 사용하는 스프라이트 제작 CLI
pnpm run test:sprite-studio # Sprite Studio 코어 검사
pnpm run format:check  # 포맷 변경 없이 검사
pnpm run format        # Prettier로 파일 수정
pnpm run test          # VS Code 테스트 실행
pnpm run verify        # 포맷, 에셋, Sprite Studio, Webview, VS Code 테스트 전체 검증
```

### Sprite Studio

`tools/sprite-studio/`는 편집 원본(`project.json`)을 구조화된 JSON 명령으로 수정하고 런타임용 PNG, manifest, 8배 미리보기 PNG를 내보내는 도구입니다. 사람용 GUI와 AI agent용 CLI가 같은 `core` 명령을 공유하는 것을 목표로 하며, 현재는 CLI만 제공합니다.

```sh
pnpm sprite-studio create <project.json> --id <id> [--width 32] [--height 32] # 새 프로젝트 생성
pnpm sprite-studio apply <project.json> <operations.json|-> # 편집 명령 적용과 diff 출력
pnpm sprite-studio inspect <project.json>            # 프로젝트 요약
pnpm sprite-studio validate <project.json>           # 프로젝트 검증
pnpm sprite-studio export <project.json> <output-directory> # PNG·manifest·미리보기 내보내기
```

반복 가능한 제작 명령은 프로젝트별 `operations.json`에 보관하고, CLI가 다시 생성하는 `project.json`과 `output/`은 포맷 검사에서 제외합니다. 지원 명령과 편집 원본 형식은 [Sprite Studio 문서](../tools/sprite-studio/README.md)를 참고하세요.

`pnpm run test`는 필요한 VS Code 테스트 바이너리를 `.vscode-test/`에 내려받을 수 있습니다. 이 디렉터리는 Git에서 제외됩니다.

## 테스트 구성

테스트는 `src/test/`에 있으며 다음 상태와 전투 규칙을 검사합니다.

- 초기 상태 생성
- 시간 경과에 따른 포만감 감소와 다음 감소 시각 계산
- 먹이를 줄 때 포만감 증가
- 최대 포만감 제한
- 기존 상태 객체 불변성
- 갱신 시각 기록
- 포만감 직접 설정과 경계값 처리
- 유효하지 않은 포만감 거부
- 현재 스키마와 맞지 않는 저장 상태 초기화
- 상태 조회와 먹이 주기 전 경과 시간 반영
- 스테이지 조회와 유효하지 않은 스테이지 거부
- 데미지, 공격 주기, 승패, 행동 수 상한 계산
- 전투 생성, 종료 전 보상 거부, 보상 중복 방지
- 전투 상태 저장, 삭제, 스키마 검증

Webview 테스트는 `webview/src/**/*.test.ts`에 있으며 `pnpm run test:webview`로 스프라이트 프레임 계산, manifest 기반 애니메이션 조회, HP 게이지 계산을 검사합니다.

Sprite Studio 코어 테스트는 `tools/sprite-studio/test/`에 있으며 `pnpm run test:sprite-studio`로 편집 명령, 픽셀 diff, 도형 채우기, 팔레트 검증을 검사합니다.

상태 규칙을 변경할 때는 해당 테스트를 먼저 갱신하고 `pnpm run verify`로 전체 검증합니다.

## 코드 위치

- `src/extension.ts`: 확장 활성화와 명령 등록
- `src/pet/pet-state.ts`: 상태 타입과 변경 규칙
- `src/pet/pet-service.ts`: 상태 처리 흐름
- `src/pet/pet-state-store.ts`: 영구 저장
- `src/pet/tamagotchi-view-provider.ts`: Webview HTML 셸과 snapshot 전송, 메시지 처리
- `src/shared/protocol.ts`: Extension과 Webview가 공유하는 메시지·snapshot 타입
- `src/battle/battle.ts`: 스테이지 설정과 전투 계산
- `src/battle/battle-service.ts`: 전투 시작과 보상 처리
- `src/battle/battle-state-store.ts`: 전투 상태 영구 저장
- `webview/`: Vite + Preact Webview 앱 (`src/screens`, `src/components`, `src/pixel`, `src/dev`)
- `dist/webview/`: Webview 빌드 결과 (Git 제외)
- `media/pixel/`: 픽셀 원본, 스프라이트, manifest, 팔레트
- `tools/sprite-studio/`: 공용 제작 코어와 AI agent용 CLI
- `scripts/validate-pixel-assets.mjs`: 픽셀 에셋 규격 검사
- `docs/pixel-perfect.md`: 픽셀 렌더링과 에셋 규격, 단계별 구축 상태
- `src/test/`: 테스트

프로젝트 소유 오류 메시지는 한국어로 작성하고 실패한 구성 요소, 구체적인 대상, 해결 방법을 포함합니다. 세부 작업 규칙은 루트의 `AGENTS.md`를 따릅니다.
