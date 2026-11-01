import { fileURLToPath, URL } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

const resolvePath = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  root: resolvePath('.'),
  plugins: [preact()],
  // 개발 서버에서 "/sprites/*.png"로 스프라이트를 제공한다. 빌드 결과에는 복사하지 않는다.
  publicDir: resolvePath('../media/pixel'),
  resolve: {
    alias: {
      '@extension': resolvePath('../src'),
    },
  },
  build: {
    outDir: resolvePath('../dist/webview'),
    emptyOutDir: true,
    copyPublicDir: false,
    target: 'es2022',
    rolldownOptions: {
      input: resolvePath('src/main.tsx'),
      output: {
        // Extension Host의 HTML 셸이 고정된 파일 이름으로 리소스를 참조한다.
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: (asset) =>
          asset.names.some((name) => name.endsWith('.css')) ? 'style.css' : '[name][extname]',
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
