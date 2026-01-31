import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // テストファイルのパターン
    include: ["tests/**/*.test.ts"],
    // タイムアウト設定（ヘッドレスブラウザを使うため長めに）
    testTimeout: 60000,
    // グローバルなセットアップ
    globals: true,
  },
});
