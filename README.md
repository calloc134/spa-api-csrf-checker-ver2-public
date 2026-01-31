# CSRF攻撃検証プラットフォーム

## 概要

本プロジェクトは、**CSRF（Cross-Site Request Forgery）攻撃**の仕組みと各種防御機構の有効性を実際に検証するための教育・研究用プラットフォームです。

異なるドメイン関係（同一オリジン、サブドメイン、完全別ドメイン）における Cookie の挙動と、各種 CSRF 防御機構の効果を実際のリクエストを通じて確認できます。

### 主な機能

- **正規フロントエンド**: 正当なリクエストを送信し、各エンドポイントの動作を確認
- **攻撃者フロントエンド**: 悪意あるサイトを模擬し、CSRF攻撃を試行
- **セキュリティログ**: 攻撃試行やバリデーション失敗をリアルタイムで記録・表示
- **複数バックエンド構成**: SameSite Cookie の挙動の違いを検証可能

### 技術スタック

- **フロントエンド**: React + Vite + TanStack Query + Tailwind CSS
- **バックエンド**: Cloudflare Workers + Hono
- **データベース**: Cloudflare D1（セキュリティログ用）
- **ホスティング**: Cloudflare Workers (同一オリジン/サブドメイン) + Surge.sh (別ドメイン)

---

## URL一覧

### 正規フロントエンド

| 構成 | URL | 対応バックエンド |
|------|-----|------------------|
| Alpha (同一オリジン) | https://csrf-backend-a.calloc134personal.workers.dev | Backend A |
| Beta (サブドメイン) | https://csrf-frontend-subdomain.calloc134personal.workers.dev | Backend B |
| Gamma (別ドメイン) | https://csrf-frontend-different-domain.surge.sh | Backend C |

### 攻撃者フロントエンド

| 構成 | URL | 備考 |
|------|-----|------|
| Beta (サブドメイン) | https://csrf-attacker-frontend-subdomain.calloc134personal.workers.dev | Backend A/B/C を攻撃 |
| Gamma (別ドメイン) | https://csrf-attacker-frontend-different-domain.surge.sh | Backend A/B/C を攻撃 |

### バックエンドAPI

| Backend | URL | SameSite Cookie | 許可オリジン |
|---------|-----|-----------------|--------------|
| A | https://csrf-backend-a.calloc134personal.workers.dev | Lax | 同一オリジン |
| B | https://csrf-backend-b.calloc134personal.workers.dev | Lax | サブドメイン |
| C | https://csrf-backend-c.calloc134personal.workers.dev | None | 別ドメイン |

---

## エンドポイント一覧

| エンドポイント | メソッド | 説明 |
|----------------|----------|------|
| `/` | GET/POST | ルートエンドポイント（SPA配信 or APIエコー） |
| `/set-cookie` | ALL | 認証用Cookieを設定 |
| `/cors-any` | GET/POST | CORS: `*`（credentials不可） |
| `/cors-specific` | GET/POST | CORS: 特定オリジン + Cookie検証 |
| `/cors-specific-content-type` | GET/POST | 上記 + Content-Type検証 |
| `/cors-specific-content-type-origin` | GET/POST | 上記 + Origin検証 |
| `/cors-specific-csrf` | GET/POST | CORS + Cookie + hono/csrf |
| `/logs` | GET | セキュリティログ取得（公開） |

---

## 各エンドポイントの防御機構

| エンドポイント | CORS | Cookie検証 | Content-Type検証 | Origin検証 | hono/csrf |
|----------------|:----:|:----------:|:----------------:|:----------:|:---------:|
| `/` | - | - | - | - | - |
| `/set-cookie` | 特定 | - | - | - | - |
| `/cors-any` | `*` | - | - | - | - |
| `/cors-specific` | 特定 | Yes | - | - | - |
| `/cors-specific-content-type` | 特定 | Yes | Yes | - | - |
| `/cors-specific-content-type-origin` | 特定 | Yes | Yes | Yes | - |
| `/cors-specific-csrf` | 特定 | Yes | - | - | Yes |

### 防御機構の詳細

#### CORS (Cross-Origin Resource Sharing)
- **`*` (Any)**: 任意のオリジンからアクセス可能。ただし `credentials: 'include'` は使用不可
- **特定オリジン**: `EXPECTED_ORIGIN` からのみアクセス可能。`credentials: 'include'` 可

#### Cookie検証
- `csrf_demo` Cookieの存在と値を検証
- 未設定または不正な値の場合は `401 Unauthorized`

#### Content-Type検証
- `application/json` のみ許可
- `text/plain` などは `415 Unsupported Media Type` で拒否
- **Simple Request によるCSRF攻撃を防御**

#### Origin検証
- リクエストの `Origin` ヘッダーを `EXPECTED_ORIGIN` と比較
- 不一致の場合は `403 Forbidden`

#### hono/csrf ミドルウェア
- Hono フレームワーク組み込みのCSRF保護
- Origin ヘッダーと Sec-Fetch-Site ヘッダーを検証
- 不正なリクエストは `403 Forbidden`

---

## CSRF攻撃の可否（理論的分析）

### 前提条件

- **攻撃対象**: POSTリクエストによる状態変更操作
- **攻撃手法**:
  - **Alpha**: `POST application/json`（CORSプリフライト発生）
  - **Beta**: `POST text/plain`（Simple Request、プリフライト無し）
  - **Gamma**: `GET`（データ読み取り攻撃）

### Backend A (SameSite=Lax, 同一オリジン)

攻撃者サイトからの攻撃シナリオ：

| エンドポイント | Alpha (POST json) | Beta (POST text/plain) | Gamma (GET) |
|----------------|:-----------------:|:----------------------:|:-----------:|
| `/cors-any` | CORS拒否 | Cookie送信されず | Cookie送信されず |
| `/cors-specific` | CORS拒否 | **Cookie送信されず** | Cookie送信されず |
| `/cors-specific-content-type` | CORS拒否 | Cookie送信されず | Cookie送信されず |
| `/cors-specific-content-type-origin` | CORS拒否 | Cookie送信されず | Cookie送信されず |
| `/cors-specific-csrf` | CORS拒否 | Cookie送信されず | Cookie送信されず |

**結果**: SameSite=Lax により、クロスサイトPOSTでCookieが送信されないため安全

### Backend B (SameSite=Lax, サブドメイン)

サブドメイン攻撃者サイトからの攻撃シナリオ：

| エンドポイント | Alpha (POST json) | Beta (POST text/plain) | Gamma (GET) |
|----------------|:-----------------:|:----------------------:|:-----------:|
| `/cors-any` | CORS拒否 | Cookie送信されず | Cookie送信されず |
| `/cors-specific` | CORS拒否 | **Cookie送信されず** | Cookie送信されず |
| `/cors-specific-content-type` | CORS拒否 | Cookie送信されず | Cookie送信されず |
| `/cors-specific-content-type-origin` | CORS拒否 | Cookie送信されず | Cookie送信されず |
| `/cors-specific-csrf` | CORS拒否 | Cookie送信されず | Cookie送信されず |

**結果**: サブドメインからでも SameSite=Lax によりクロスサイトPOSTでCookieが送信されない

### Backend C (SameSite=None, 別ドメイン)

別ドメイン攻撃者サイトからの攻撃シナリオ：

| エンドポイント | Alpha (POST json) | Beta (POST text/plain) | Gamma (GET) |
|----------------|:-----------------:|:----------------------:|:-----------:|
| `/cors-any` | CORS拒否 | Cookie送信 (レスポンス読めず) | CORS拒否 |
| `/cors-specific` | CORS拒否 | **脆弱 (攻撃成功)** | CORS拒否 |
| `/cors-specific-content-type` | CORS拒否 | 415エラー (防御成功) | CORS拒否 |
| `/cors-specific-content-type-origin` | CORS拒否 | 403エラー (防御成功) | CORS拒否 |
| `/cors-specific-csrf` | CORS拒否 | 403エラー (防御成功) | CORS拒否 |

**結果**: `/cors-specific` のみ **Beta攻撃（Simple Request）に対して脆弱**

### 攻撃可否サマリー

| 条件 | `/cors-specific` | `/cors-specific-content-type` | `/cors-specific-content-type-origin` | `/cors-specific-csrf` |
|------|:----------------:|:-----------------------------:|:------------------------------------:|:---------------------:|
| SameSite=Lax環境 | 安全 | 安全 | 安全 | 安全 |
| SameSite=None + Alpha攻撃 | 安全 | 安全 | 安全 | 安全 |
| SameSite=None + Beta攻撃 | **脆弱** | 安全 | 安全 | 安全 |
| SameSite=None + Gamma攻撃 | 安全 | 安全 | 安全 | 安全 |

---

## 脆弱性の詳細解説

### なぜ `/cors-specific` は Beta 攻撃に脆弱なのか

1. **Simple Request の条件**
   - `text/plain` は Simple Request として扱われる
   - Simple Request は CORS プリフライトをトリガーしない
   - ブラウザは直接リクエストを送信する

2. **SameSite=None の挙動**
   - クロスサイトリクエストでも Cookie を送信
   - `Secure` 属性が必須（HTTPS のみ）

3. **CORS の限界**
   - CORS はレスポンスの読み取りを制御
   - **リクエスト自体の送信は阻止しない**
   - Simple Request では検証なしにリクエストが到達

4. **攻撃の成立**
   ```
   攻撃者サイト → POST text/plain + Cookie → バックエンド → 200 OK (状態変更完了)
                                                       ↓
                                           レスポンスは読めないが
                                           リクエストは実行済み
   ```

### 対策

以下のいずれかの防御機構を追加することで防御可能：

1. **Content-Type 検証**: `application/json` のみ許可
2. **Origin 検証**: リクエストの Origin ヘッダーを確認
3. **hono/csrf**: フレームワーク組み込みの CSRF 保護
4. **CSRF トークン**: フォームごとにランダムなトークンを検証

---

## ローカル開発

### 必要環境

- Node.js 18+
- pnpm 9+

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発サーバー起動（別ターミナルで）
pnpm dev:backend:a   # Backend A (port 8787)
pnpm dev:legit       # 正規フロントエンド (port 5173)
pnpm dev:attacker    # 攻撃者フロントエンド (port 5174)
```

### ビルド・デプロイ

```bash
# 全てビルド
pnpm build:all

# 全てデプロイ
pnpm deploy:all
```

---

## テスト

Playwright を使用した E2E テストが含まれています。

```bash
pnpm test        # テスト実行
pnpm test:watch  # ウォッチモード
```

### テストケース

- **csrf-attack-vulnerable.test.ts**: `/cors-specific` の脆弱性検証
- **csrf-attack-protected.test.ts**: 保護されたエンドポイントの検証

---

## プロジェクト構成

```
spa-api-csrf-checker-ver2/
├── apps/
│   ├── legit-frontend/      # 正規フロントエンド (React)
│   └── attacker-frontend/   # 攻撃者フロントエンド (React)
├── workers/
│   ├── backend/             # バックエンドAPI (Cloudflare Workers)
│   └── static-sites/        # 静的サイト配信設定
├── tests/                   # E2Eテスト
└── package.json             # ルートパッケージ設定
```

---

## 注意事項

- 本プロジェクトは**教育・研究目的**で作成されています
- 実際のシステムに対する攻撃は**違法**です
- 脆弱性のあるエンドポイントは意図的に作成されています
- 本番環境では適切な CSRF 対策を必ず実装してください

---

## ライセンス

MIT License
