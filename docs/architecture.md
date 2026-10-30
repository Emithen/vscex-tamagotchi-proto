# 아키텍처

## 전체 구조

확장은 상태 계산, 저장, 화면 연결을 분리합니다.

```text
Webview
  │ feed / startBattle / claimBattleReward 메시지
  ▼
TamagotchiViewProvider
  ├── PetService → PetStateStore
  └── BattleService → BattleStateStore
                              │
                              ▼
                        VS Code globalState
```

## 구성 요소

### Extension 진입점

`src/extension.ts`는 확장 활성화 시 저장소, 서비스, Webview Provider를 조립합니다. `tamagotchi.setFullness` 개발 명령도 이곳에서 등록합니다.

### 상태 모델

`src/pet/pet-state.ts`는 `PetState` 타입과 순수 상태 변경 함수를 제공합니다.

```ts
type PetState = {
  name: string;
  fullness: number;
  nextFullnessDecayAt: number;
};
```

- 초기 이름: `물짱이`
- 초기 포만감: `5`
- 허용 범위: `0~10`
- 먹이 주기: 포만감 1 증가, 최대 10 유지
- `nextFullnessDecayAt`: 다음 포만감 감소 예정 시각

상태 함수는 기존 객체를 변경하지 않고 새로운 객체를 반환합니다.

포만감 감소 시각은 이름이나 향후 추가될 다른 상태의 갱신 시각과 분리합니다. 현재 상태 스키마와 맞지 않는 개발 중 저장 데이터는 초기 상태로 덮어씁니다.

### 서비스와 저장소

`src/pet/pet-service.ts`는 현재 상태 조회, 다음 상태 계산, 저장 순서를 관리합니다. `src/pet/pet-state-store.ts`는 `tamagotchi.petState` 키로 VS Code `globalState`를 읽고 씁니다.

저장된 상태가 없으면 초기 상태를 생성해 저장합니다. `reset()` 서비스 메서드는 구현되어 있지만 현재 사용자 인터페이스에는 연결되어 있지 않습니다.

상태를 조회할 때는 먼저 현재 시각까지의 포만감 감소를 반영하고, 상태가 달라진 경우에만 저장합니다. 먹이를 줄 때도 경과 시간을 먼저 반영한 뒤 동일한 기준 시각으로 먹이 주기를 처리합니다.

### Webview

`src/pet/tamagotchi-view-provider.ts`는 상태를 읽어 HTML 템플릿에 반영하고 Webview 메시지를 처리합니다. 화면 리소스는 `media/pet-view/`에 분리되어 있습니다.

먹이 주기 흐름은 다음과 같습니다.

1. `main.js`가 `{ type: "feed" }` 메시지를 보냅니다.
2. Provider가 `PetService.feed()`를 호출합니다.
3. 서비스가 새 상태를 계산하고 저장합니다.
4. Provider가 저장된 상태로 Webview HTML을 다시 렌더링합니다.

Webview는 로컬 `media` 디렉터리만 리소스 루트로 허용하며, 스크립트 실행에는 매 렌더링 시 생성한 nonce와 Content Security Policy를 사용합니다.

View가 보이는 동안에는 `nextFullnessDecayAt`에 맞춰 다음 화면 갱신을 한 번 예약합니다. View가 숨겨지거나 닫히면 타이머를 해제하고, 다시 보일 때 저장 상태와 경과 시간을 기준으로 즉시 갱신합니다. 포만감이 0이면 화면 변화가 없으므로 타이머를 예약하지 않습니다.

### 전투

`src/battle/battle.ts`는 전투원, 스탯, 스테이지 설정과 전투 시뮬레이션을 담습니다. 스테이지는 ID, 표시 이름, 적, 승리 경험치를 하나의 설정으로 관리합니다.

`BattleService`는 스테이지 설정으로 행동 목록을 미리 계산하고 `BattleStateStore`에 저장합니다. Webview는 행동 시각에 맞춰 HP와 로그를 재생하며, 전투 종료 시각이 지난 후에만 보상을 수령할 수 있습니다. 펫 상태의 `lastRewardedBattleId`로 같은 전투의 경험치가 두 번 적용되는 것을 방지합니다.
