# Repository Workflow

- Work directly on the `main` branch for this repository.
- Do not create a feature branch or Git worktree unless the user explicitly requests one.
- Before editing, preserve any existing user changes in the working tree and avoid overwriting unrelated work.

## Error Message Style

- Write project-owned error messages in Korean.
- Include the component or operation that failed, the concrete target involved, and a useful troubleshooting action.
- Preserve technical identifiers such as CSS selectors, filenames, and command names exactly, wrapped in double quotes.
- Prefer specific descriptions such as "찾지 못했습니다" over vague messages such as "오류가 발생했습니다."
- Throw an `Error` object instead of a string literal.
- Do not include secrets or sensitive runtime data in error messages.

Example:

`Tamagotchi Webview 초기화 실패: 필수 요소 ".feed-button"을 문서에서 찾지 못했습니다. index.html의 버튼 클래스와 main.js의 선택자를 확인하세요.`
