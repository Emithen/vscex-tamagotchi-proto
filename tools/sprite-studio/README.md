# Sprite Studio

사람용 시각적 편집기와 AI agent용 CLI가 함께 사용할 픽셀 스프라이트 제작 코어입니다.
현재 단계에서는 구조화된 명령으로 편집 원본을 수정하고 런타임용 PNG와 manifest를 내보내는 최소 기능을 제공합니다.

## 구조

```text
sprite-studio/
├── core/   # 프로젝트 모델, 편집 명령, 검증, 내보내기
├── cli/    # AI agent와 자동화용 인터페이스
└── test/   # 코어 동작 검사
```

향후 사람용 GUI도 `core`의 동일한 명령을 호출합니다. GUI에 별도의 편집 규칙을 만들지 않습니다.

## 빠른 시작

```sh
pnpm sprite-studio create tools/sprite-studio/projects/sample/project.json --id sample
pnpm sprite-studio apply tools/sprite-studio/projects/sample/project.json operations.json
pnpm sprite-studio inspect tools/sprite-studio/projects/sample/project.json
pnpm sprite-studio export tools/sprite-studio/projects/sample/project.json output/sample
```

`apply`의 두 번째 인자에 `-`를 사용하면 표준 입력에서 JSON 명령 배열을 읽습니다.

```json
[
  { "op": "setPaletteColor", "name": "outline", "symbol": "O", "color": "#010f3d" },
  { "op": "setPaletteColor", "name": "body", "symbol": "B", "color": "#66c2c6" },
  { "op": "addFrame", "id": "idle-0" },
  {
    "op": "fillRect",
    "frame": "idle-0",
    "x": 8,
    "y": 8,
    "width": 16,
    "height": 16,
    "color": "body"
  },
  { "op": "setPixel", "frame": "idle-0", "x": 8, "y": 8, "color": "outline" },
  { "op": "cloneFrame", "from": "idle-0", "id": "idle-1" },
  { "op": "setAnimation", "name": "idle", "frames": ["idle-0", "idle-1"], "fps": 4, "loop": true }
]
```

편집 원본의 픽셀은 행 문자열로 저장됩니다. `.`은 투명 픽셀이며 나머지 단일 문자 기호는 이름 있는 팔레트 색상을 가리킵니다. AI 명령에서는 기호 대신 `outline`, `body` 같은 팔레트 이름을 사용합니다.

`projects/*/project.json`과 `projects/*/output/`은 CLI가 다시 생성하는 파일이므로 일반 소스 포맷 검사에서 제외합니다. 반복 가능한 제작 명령은 각 프로젝트의 `operations.json`에 보관합니다.

## 현재 지원 명령

- `setPaletteColor`: 이름 있는 팔레트 색상 추가 또는 변경
- `setAnchor`: 공통 기준점 변경
- `addFrame`: 투명 프레임 추가
- `cloneFrame`: 기존 프레임 복제
- `setPixel`: 한 픽셀 변경
- `fillRect`: 사각형 영역 채우기
- `fillEllipse`: 픽셀 격자에 타원 영역 채우기
- `moveRegion`: 선택 영역을 정수 픽셀 단위로 이동
- `flipRegion`: 선택 영역을 가로 또는 세로로 반전
- `setAnimation`: 프레임 순서, FPS, 반복 여부 지정

`apply`는 수정된 프레임, 변경 픽셀 수와 변경 범위를 JSON diff로 출력합니다. `export`는 서비스용 PNG와 manifest 외에 8배 확대된 체크무늬 배경의 `*-preview.png`도 생성합니다. AI agent는 이 미리보기를 열어 결과를 시각적으로 확인할 수 있습니다.

다음 단계에서 이름 있는 영역, 애니메이션 미리보기와 사람용 GUI를 추가합니다.
