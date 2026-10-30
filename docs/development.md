# 개발 가이드

## 준비

- VS Code `1.140.0` 이상
- Node.js와 `pnpm`

의존성을 설치합니다.

```sh
pnpm install
```

## 실행과 디버깅

VS Code에서 저장소를 열고 `F5`를 누릅니다. `Run Extension` 실행 구성이 TypeScript 감시 작업을 시작한 뒤 Extension Development Host를 엽니다.

새 창의 Activity Bar에서 `Tamagotchi`를 선택하면 펫 화면을 확인할 수 있습니다.

Command Palette에서 `Tamagotchi (개발): 포만감 설정`을 실행하면 포만감을 `0~10` 사이의 정수로 직접 바꿀 수 있습니다.

## 주요 명령

```sh
pnpm run compile       # TypeScript 컴파일
pnpm run watch         # TypeScript 변경 감시
pnpm run lint          # TypeScript와 Webview JavaScript 린트
pnpm run format:check  # 포맷 변경 없이 검사
pnpm run format        # Prettier로 파일 수정
pnpm run test          # VS Code 테스트 실행
pnpm run verify        # 포맷, 컴파일, 린트, 테스트 전체 검증
```

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

상태 규칙을 변경할 때는 해당 테스트를 먼저 갱신하고 `pnpm run verify`로 전체 검증합니다.

## 코드 위치

- `src/extension.ts`: 확장 활성화와 명령 등록
- `src/pet/pet-state.ts`: 상태 타입과 변경 규칙
- `src/pet/pet-service.ts`: 상태 처리 흐름
- `src/pet/pet-state-store.ts`: 영구 저장
- `src/pet/tamagotchi-view-provider.ts`: Webview 연결과 렌더링
- `src/battle/battle.ts`: 스테이지 설정과 전투 계산
- `src/battle/battle-service.ts`: 전투 시작과 보상 처리
- `src/battle/battle-state-store.ts`: 전투 상태 영구 저장
- `media/pet-view/`: HTML, CSS, 브라우저 측 JavaScript
- `src/test/`: 테스트

프로젝트 소유 오류 메시지는 한국어로 작성하고 실패한 구성 요소, 구체적인 대상, 해결 방법을 포함합니다. 세부 작업 규칙은 루트의 `AGENTS.md`를 따릅니다.
