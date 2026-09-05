import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages にプロジェクトページとしてデプロイする場合、
// リポジトリ名に合わせて base を変更してください。
// 例: リポジトリ名が "ObservationPointEditor" の場合
//   base: '/ObservationPointEditor/'
// カスタムドメインを使う場合は '/' のままで問題ありません。
const REPO_BASE = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base: REPO_BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ObservationPointEditor',
        short_name: 'ObservationPointEditor',
        description: '強震モニタ観測点編集ソフト',
        theme_color: '#1e2327',
        background_color: '#1e2327',
        display: 'standalone',
        icons: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
  },
});
