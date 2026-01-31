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

### 表の見方

- **横軸**: 被害者に踏ませるための攻撃者のページ
- **縦軸**: 本来の通信元である正規のSPAページ

また、以下の記号を使用する：

- **A**: 適切な SameSite属性を設定した際の クッキーの送信挙動によるCSRF耐性
- **B**: 適切な CORSポリシーを設定した際の 同一オリジンポリシー(SOP) によるCSRF耐性

---

### α. 攻撃者ページからの fetch api を用いた unsafe method による CSRF 攻撃

攻撃に成功したとされる条件は以下の通り：

- 攻撃者ページからの fetch api を用いた unsafe method によるリクエスト送信が成功すること
  - 送信自体がブロックされないこと

それぞれの条件において、CSRF攻撃を防御する防御機構が働くかを以下の表に示す。

| 正規SPA ＼ 攻撃者ページ | サブドメイン（本家とは別） | 完全別ドメイン |
|---|:---:|:---:|
| 完全同一ドメイン SameSite=Lax | B | A, B |
| サブドメイン SameSite=Lax Access-Control-Allow-Credentials有 | B | A, B |
| 完全別ドメイン SameSite=None Access-Control-Allow-Credentials有 | B | B |

この表から、すべての例において同一オリジンポリシー（SOP）による防御機構（CORSポリシー）が働くことがわかります。また、本来の通信元である正規のSPAページが完全同一ドメインまたはサブドメインであり、かつ攻撃者ページが完全別ドメインである場合には、クッキーのSameSite属性による防御機構も働きます。したがって、Originヘッダ検証を怠った場合でも、CSRF攻撃は成立しません。

---

### β. text/plain 等の simple request と認識されるコンテンツタイプを用いた CSRF 攻撃

攻撃に成功したとされる条件は以下の通り：

- 攻撃者ページからの fetch api もしくは フォーム送信を用いた POST によるリクエスト送信が成功すること
  - 送信自体がブロックされないこと

それぞれの条件において、CSRF攻撃を防御する防御機構が働くかを以下の表に示す。

| 正規SPA ＼ 攻撃者ページ | サブドメイン（本家とは別） | 完全別ドメイン |
|---|:---:|:---:|
| 完全同一ドメイン SameSite=Lax | なし | A |
| サブドメイン SameSite=Lax Access-Control-Allow-Credentials有 | なし | A |
| 完全別ドメイン SameSite=None Access-Control-Allow-Credentials有 | なし | なし |

この表から、「なし」と示されている部分では、CSRF攻撃を防御する防御機構が働かないことがわかります。そのため、これらのケースではCSRF攻撃に脆弱です。ただし、本来の通信元である正規のSPAページが完全同一ドメインまたはサブドメインであり、かつ攻撃者ページが完全別ドメインである場合には、クッキーのSameSite属性による防御機構が働くため、CSRF攻撃は成立しません。

#### この攻撃方法の特徴

- JSON データのみを受け付けるべきである API に対して
- simple request の範疇に収まる条件のリクエストを送信できてしまう点が問題

したがって、以下の条件に該当するものは そもそもAPIで受け入れないことが望ましい：

- POST メソッドである
- リクエストヘッダが 以下のもの のみで構成されている
  - Accept
  - Accept-Language
  - Content-Language
  - Content-Type（ただし 以下のいずれかの値に限る）
    - `application/x-www-form-urlencoded`
    - `multipart/form-data`
    - `text/plain`

前述の通り 開発者は、API の要件に不要な場合は、simple request と認識されるリクエストを API で受け入れないようにすることが望ましい。

API フレームワークの実装によっては、JSON を受け取る際に 本当にコンテンツタイプが `application/json` であるかを検証するものもある。しかし、そのような実装になっていない場合も多い。

例: Hono の `c.req.json()` メソッドはコンテンツタイプを検証しない（パフォーマンス低下を避けるためと思われる）

開発者がしっかり自衛を行うことが大事。

ただし、Hono の場合は `hono/csrf` ミドルウェアを提供している：
- simple request と認識されるリクエストに対して
- `Origin` ヘッダ検証（+ Sec-Fetch-Site ヘッダ検証）を行うことで 実質的に このタイプのCSRF攻撃を防止できる
- このような設計により 最小限のパフォーマンス低下で 現実的なCSRF攻撃の脅威を防止している

#### 余談: 他コンテンツタイプの悪用可能性

ここでは、一番想定される例として コンテンツタイプに `text/plain` を提示した。ただし API側が以下のコンテンツタイプを受け付ける場合、これらも悪用される可能性がある：
- `multipart/form-data`
- `application/x-www-form-urlencoded`

#### 余談2: 他の送信手段の悪用可能性

以下の手段が考えられる：
- **フォーム送信**: `<form>` タグを用いてフォームを作成し `submit()` メソッドを呼び出す もしくは ボタンをクリックさせることで リクエスト送信
- **fetch api**: fetch api を用いて `text/plain` 等の simple request と認識されるコンテンツタイプを用いたリクエスト送信

---

### γ. 攻撃者ページからの fetch api を用いた safe method によるクロスサイト読み取り攻撃

攻撃に成功したとされる条件は以下の通り：

- 攻撃者ページからの fetch api を用いた safe method によるリクエスト送信が成功し
- レスポンスの内容が攻撃者ページの JavaScript に渡されること

**注意点**: この場合は safe method なので、CORSの防衛ラインの軸足が「APIを呼び出さない」から「API呼び出しは許容するがそのデータは閲覧できない」に変化することに注意

それぞれの条件において、クロスサイト読み取り攻撃を防御する防御機構が働くかを以下の表に示す。

| 正規SPA ＼ 攻撃者ページ | サブドメイン（本家とは別） | 完全別ドメイン |
|---|:---:|:---:|
| 完全同一ドメイン SameSite=Lax | B | A, B |
| サブドメイン SameSite=Lax Access-Control-Allow-Credentials有 | B | A, B |
| 完全別ドメイン SameSite=None Access-Control-Allow-Credentials有 | B | B |

この表から、すべての例において同一オリジンポリシー（SOP）による防御機構（CORSポリシー）が働くことがわかります。また、本来の通信元である正規のSPAページが完全同一ドメインまたはサブドメインであり、かつ攻撃者ページが完全別ドメインである場合には、クッキーのSameSite属性による防御機構も働きます。したがって、Originヘッダ検証を怠った場合でも、クロスサイト読み取り攻撃は成立しません。

#### 余談1: safe method での副作用

副作用の発生するAPI は safe method で実装しないことが重要。

safe method において、同一オリジンポリシー (SOP) の防御機構はレスポンスの取得に関しては制限するが、リクエストの送信自体は制限しない。そのため、safe method で副作用を発生させるAPIが存在している場合、CSRF攻撃が成立してしまう可能性がある。

#### 余談2: ワイルドカード CORS の危険性

`Access-Control-Allow-Origin` に ワイルドカード `*` を設定し、かつ `Access-Control-Allow-Credentials` ヘッダが `true` に設定されている場合は、ブラウザは レスポンス内容を JavaScript に渡さずエラーにするのは前述の通り。

ただし、`Access-Control-Allow-Origin` に ワイルドカード `*` を設定してしまっており、かつクッキー情報無しでアクセスできるAPIが存在した場合は、クロスサイト読み取り攻撃が成立してしまう可能性がある。

ただしそもそも、そのようなAPI設計は今回の前提条件に反するため ここでは考慮しない。

#### 余談3: Origin ヘッダの付与条件

Origin ヘッダは、同一オリジン = 完全同一ドメインで GET, HEAD のみ付属しないという特徴がある。

これは、完全同一ドメインかつ safe method の場合 CSRF攻撃の危険性が極めて少なく、心配する必要がないと判断されるからである。したがって、同一オリジンかつ safe method の場合には Origin ヘッダ検証を省略することができる。

---

## 結論

### α: fetch api を用いた unsafe method による CSRF 攻撃
- Origin ヘッダ検証を怠った場合でも CSRF 攻撃が成立しないことが多い

### β: simple request を用いた CSRF 攻撃

Originヘッダ検証を怠った場合にCSRF攻撃が成立する可能性があります。そのため、開発者はAPIの要件として不要な場合には、simple requestと認識されるリクエストをAPIで受け入れないようにすることが望ましいです。または、Honoの`hono/csrf`ミドルウェアを利用して、simple requestと認識されるリクエストに対してOriginヘッダ検証を行うことが推奨されます。

### γ: safe method によるクロスサイト読み取り攻撃
- Origin ヘッダ検証を怠った場合でも クロスサイト読み取り攻撃が成立しないことが多い

### 総括

以上より、Origin ヘッダ検証を怠った場合においても、基本的には 適切な CORSポリシーを設定した際の 同一オリジンポリシー(SOP) によるCSRF耐性が働くことで、CSRF攻撃・クロスサイト読み取り攻撃を防御できる場合が多いことがわかる。

SameSite属性によるCSRF耐性も副次的に働く場合があるが、同一オリジンポリシーよりは防御効果が低い。

どちらの場合も、β の攻撃方法に対しては防御効果がない場合がある。その部分のみ `hono/csrf` ミドルウェアで狙い撃ちの防御を行うことが望ましい。

### 推奨される対策

基本的には以下に気をつけて実装すれば、CSRFは防御できます。まず、`hono/cors`で正しくCORSポリシーを設定すること、クッキーのSameSite属性を適切に設定すること、そしてデータを変更するAPI（副作用あり）とデータを取得するAPI（副作用なし）でメソッドを分離することが重要です。

更に安全を期すのであれば、`hono/csrf`ミドルウェアの代わりに以下の対策を追加することが望ましいです。すべてのリクエストに対してOriginヘッダ検証を行うことが有効ですが、同一ドメイン（同一オリジン）かつGET/HEADの場合はOriginヘッダが付属しないため、例外的に検証をスキップする必要があります。また、コンテンツタイプを`application/json`のみ受け入れるようにすることも効果的です。ただし、この場合は独自実装になるため注意が必要です。

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
