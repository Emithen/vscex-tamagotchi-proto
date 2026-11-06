# 아키텍처

## 전체 구조

확장은 상태 계산, 저장, 화면 연결을 분리합니다.

```text
Webview 앱 (webview/, Preact)
  │ ready / feed / startBattle / claimBattleReward / battleFinished 메시지
  ▼                              ▲ snapshot 메시지
TamagotchiViewProvider ──────────┘
  ├── PetService → PetStateStore
  └── BattleService → BattleStateStore
                              │
                              ▼
                        VS Code globalState
```

## 구성 요소

### Extension 진입점

`src/extension.ts`는 확장 활성화 시 저장소, 서비스, Webview Provider를 조립합니다. `tamagotchi.setFullness` 개발 명령도 이곳에서 등록합니다.

### 게임 데이터셋과 시나리오 (`src/data/`)

게임 규칙과 도감·스테이지 설정은 코드 로직과 분리해 `src/data/` 아래의 TypeScript 모듈로 관리합니다.

- `src/data/types.ts`: 최상위 `GameData` 스키마(`care`, `species`, `battle`, `stages`) 타입 정의
- `src/data/species.ts`: 포켓몬 종별(`mudkip`, `marshtomp`, `swampert`) 이름, 전투 스탯, 진화 요구 경험치 카탈로그
- `src/data/stages.ts`: 전투 스테이지(`grassland-1`) 카탈로그
- `src/data/game-data.ts`: 개발·테스트용 데이터셋(`DEV_TEST_GAME_DATA`, 진화 요구 경험치 `10 → 20`)과 프로덕션 데이터셋(`PRODUCTION_GAME_DATA`, 진화 요구 경험치 `50 → 100`) 조립
- `src/data/scenarios.ts`: 브라우저 프리뷰와 테스트에서 즉시 주입할 수 있는 상태 시나리오 프리셋(`GAME_SCENARIOS`)

`src/extension.ts`는 `context.extensionMode`에 따라 프로덕션과 개발·테스트 데이터셋을 선택해 서비스에 주입하며, 순수 상태·전투 함수는 인자로 전달된 `GameData`를 기준으로 동작합니다.

### 상태 모델

`src/pet/pet-state.ts`는 `PetState` 타입과 순수 상태 변경 함수를 제공합니다.

```ts
type PetState = {
  speciesId: 'mudkip' | 'marshtomp' | 'swampert';
  name: string;
  fullness: number;
  experience: number;
  lastRewardedBattleId?: string;
  nextFullnessDecayAt: number;
};
```

- 초기 종: `mudkip` (`물짱이`)
- 초기 포만감: `5` (허용 범위 `0~10`, 먹이 주기 시 1 증가)
- 진화 경험치: 별도 레벨 없이 단계별 요구 경험치(`mudkip → marshtomp: 10`, `marshtomp → swampert: 20`)를 채우면 즉시 자동 진화하며, 최종 단계(`swampert`)에서는 `MAX` 상태로 고정
- `nextFullnessDecayAt`: 다음 포만감 감소 예정 시각

상태 함수는 기존 객체를 변경하지 않고 새로운 객체를 반환합니다.

포만감 감소 시각은 이름이나 향후 추가될 다른 상태의 갱신 시각과 분리합니다. 현재 상태 스키마와 맞지 않는 개발 중 저장 데이터는 초기 상태로 덮어씁니다.

### 서비스와 저장소

`src/pet/pet-service.ts`는 현재 상태 조회, 다음 상태 계산, 저장 순서를 관리합니다. `src/pet/pet-state-store.ts`는 `tamagotchi.petState` 키로 VS Code `globalState`를 읽고 씁니다.

저장된 상태가 없으면 초기 상태를 생성해 저장합니다. `reset()` 서비스 메서드는 구현되어 있지만 현재 사용자 인터페이스에는 연결되어 있지 않습니다.

상태를 조회할 때는 먼저 현재 시각까지의 포만감 감소를 반영하고, 상태가 달라진 경우에만 저장합니다. 먹이를 줄 때도 경과 시간을 먼저 반영한 뒤 동일한 기준 시각으로 먹이 주기를 처리합니다.

### Webview

Webview 화면은 `webview/`의 Preact 앱이 담당하고, Extension Host는 상태만 전달합니다. 두 영역이 주고받는 메시지와 화면 상태 타입은 `src/shared/protocol.ts` 한 곳에서 정의하며 양쪽이 같은 파일을 import합니다.

- `src/pet/tamagotchi-view-provider.ts`: View가 열릴 때 HTML 셸을 한 번만 설정하고, 상태가 바뀔 때마다 `{ type: "snapshot" }` 메시지로 `ViewSnapshot`을 보냅니다.
- `webview/src/app.tsx`: snapshot을 받아 홈, 스테이지, 전투, 결과 화면을 선택합니다. 홈과 스테이지 사이의 전환처럼 Extension 상태와 무관한 화면 상태는 Webview 안에서만 유지합니다.
- `webview/src/bridge.ts`: VS Code 안에서는 `acquireVsCodeApi`를 사용하고, 브라우저 개발 모드에서는 순수 상태 함수로 동작하는 `webview/src/dev/mock-host.ts`를 사용합니다.

먹이 주기 흐름은 다음과 같습니다.

1. Webview가 eat 애니메이션을 한 번 재생한 뒤 `{ type: "feed" }` 메시지를 보냅니다.
2. Provider가 `PetService.feed()`를 호출합니다.
3. 서비스가 새 상태를 계산하고 저장합니다.
4. Provider가 새 snapshot을 보내고 Webview가 바뀐 부분만 다시 렌더링합니다.

Webview 앱은 Vite로 `dist/webview/main.js`와 `dist/webview/style.css`에 고정된 이름으로 빌드됩니다. Webview는 `dist/webview`와 `media/pixel/sprites`만 리소스 루트로 허용하며, 스크립트 실행에는 View 생성 시 만든 nonce와 Content Security Policy를 사용합니다. 스프라이트 기본 경로는 HTML 셸의 `data-sprite-base-uri`로 전달합니다.

Webview 콘텐츠는 144×216 논리 화면인 `.pixel-canvas`에 렌더링됩니다. `.pixel-viewport`는 가용 너비와 높이에 따라 1×, 2×, 3× 정수 배율만 사용하고 분수 배율로 인한 픽셀 경계 흐림을 방지합니다. 세부 규격과 단계별 전환 계획은 `docs/pixel-perfect.md`에 기록합니다.

`media/pixel/manifests/`는 스프라이트 프레임 크기, 애니메이션 FPS, 반복 여부, 팔레트 제한을 정의합니다. `scripts/validate-pixel-assets.mjs`는 manifest와 PNG를 함께 읽어 시트 크기, 프레임 인덱스, 색상 수, 알파값을 검증합니다. Webview는 빌드 시 이 manifest를 번들에 포함해 프레임 크기, FPS, 반복 여부를 그대로 사용합니다(`webview/src/pixel/sprites.ts`). Canvas 렌더러는 `imageSmoothingEnabled = false`로 스프라이트를 재생하며 모션 감소 설정에서는 첫 프레임을 유지합니다.

View가 보이는 동안에는 `nextFullnessDecayAt`에 맞춰 다음 snapshot 전송을 한 번 예약합니다. View가 숨겨지거나 닫히면 타이머를 해제하고, 다시 보일 때 저장 상태와 경과 시간을 기준으로 즉시 갱신합니다. 포만감이 0이면 화면 변화가 없으므로 타이머를 예약하지 않습니다.

### 전투

`src/battle/battle.ts`는 전투원, 스탯, 스테이지 설정과 전투 시뮬레이션을 담습니다. 스테이지는 ID, 표시 이름, 적, 승리 경험치를 하나의 설정으로 관리합니다.

`BattleService`는 스테이지 설정으로 행동 목록을 미리 계산하고 `BattleStateStore`에 저장합니다. Webview는 행동 시각에 맞춰 HP와 로그를 재생하며, 전투 종료 시각이 지난 후에만 보상을 수령할 수 있습니다. 펫 상태의 `lastRewardedBattleId`로 같은 전투의 경험치가 두 번 적용되는 것을 방지합니다.
