# Tamagotchi

VS Code 사이드바에서 돌보는 작은 다마고치 확장 프로그램 프로토타입입니다.

## 현재 기능

- Activity Bar에서 Tamagotchi Webview 열기
- 펫 이름과 이미지, 포만감 표시
- 먹이를 주어 포만감을 1씩 증가
- 1시간마다 포만감을 1씩 감소하고 VS Code가 닫혀 있던 시간도 반영
- 포만감을 0부터 10 사이로 제한
- VS Code `globalState`에 펫 상태 저장
- 개발 명령으로 포만감 직접 설정
- `초원 1` 스테이지에서 물짱이끼리 자동전투
- 전투 진행과 HP를 실시간으로 재생하고 승리 경험치 지급
- 전투 상태 저장과 보상 중복 수령 방지
- 144×216 논리 화면과 정수 배율의 Pixel Perfect UI
- 32×32 픽셀 펫 idle 애니메이션과 에셋 자동 검사

기본 펫의 이름은 `물짱이`이고 초기 포만감은 5입니다.

## 개발 시작

```sh
pnpm install
pnpm run verify
```

VS Code에서 이 저장소를 연 뒤 `F5`를 누르면 Extension Development Host에서 확장을 실행할 수 있습니다.

## 문서

먼저 [로드맵](docs/roadmap.md)에서 현재 진행 상황과 다음 작업을 확인하세요. 전체 문서 구성은 [문서 안내](docs/README.md)에 정리되어 있습니다.

- [아키텍처](docs/architecture.md)
- [전투 밸런싱](docs/balance.md)
- [Pixel Perfect 시스템](docs/pixel-perfect.md)
- [개발 가이드](docs/development.md)

## 상태

현재 버전은 `0.0.1`이며 핵심 상호작용을 검증하는 프로토타입 단계입니다. 배포 가능한 제품보다는 상태 관리와 Webview 연동을 실험하는 데 초점을 두고 있습니다.
