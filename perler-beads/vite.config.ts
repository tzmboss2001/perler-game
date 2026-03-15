import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3005,
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8012',
        changeOrigin: true,
      },
      '/finished-works': {
        target: 'http://localhost:8012',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8012',
        changeOrigin: true,
      },
      '/finished-works': {
        target: 'http://localhost:8012',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  build: {
    // 后端会在 dist 下写入缩略图资源，Windows 下可能导致构建清空目录失败。
    // 关闭 emptyOutDir 以避免 ENOTEMPTY 阻断发布流程。
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
