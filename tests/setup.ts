/**
 * CSRF攻撃テスト - 共通設定・ユーティリティ
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

/**
 * 設定
 */
export const CONFIG = {
  // バックエンドURL
  backends: {
    A: 'https://csrf-backend-a.calloc134personal.workers.dev',
    B: 'https://csrf-backend-b.calloc134personal.workers.dev',
    C: 'https://csrf-backend-c.calloc134personal.workers.dev',
  },
  // 正規フロントエンドURL（クッキー取得用）
  legitFrontends: {
    // Backend A: 同一オリジン（バックエンドと同じURL）
    A: 'https://csrf-backend-a.calloc134personal.workers.dev',
    // Backend B: サブドメイン
    B: 'https://csrf-frontend-subdomain.calloc134personal.workers.dev',
    // Backend C: 完全別ドメイン
    C: 'https://csrf-frontend-different-domain.surge.sh',
  },
  // 攻撃者サイト
  attackers: {
    // サブドメイン攻撃者 (*.calloc134personal.workers.dev だが、正規フロントエンドとは別のサブドメイン)
    subdomain: 'https://csrf-attacker-frontend-subdomain.calloc134personal.workers.dev',
    // 完全別ドメイン攻撃者
    differentDomain: 'https://csrf-attacker-frontend-different-domain.surge.sh',
  },
  // テスト対象のエンドポイント
  endpoints: {
    setCookie: '/set-cookie',
    corsSpecific: '/cors-specific',
    corsSpecificContentType: '/cors-specific-content-type',
    corsSpecificContentTypeOrigin: '/cors-specific-content-type-origin',
    corsSpecificCsrf: '/cors-specific-csrf',
  },
} as const

export type BackendId = 'A' | 'B' | 'C'
export type AttackerType = 'subdomain' | 'differentDomain'

/**
 * Chromium のパス（システムインストール済みのものを使用）
 */
export const CHROMIUM_PATH = '/usr/bin/chromium'

/**
 * ログ取得ユーティリティ
 * 指定されたバックエンドから特定のオリジンが発信元のログを取得
 */
export async function fetchLogs(
  backendId: BackendId,
  origin: string,
  limit = 100
): Promise<{
  ok: boolean
  logs: Array<{
    id: number
    alertType: string
    severity: string
    endpoint: string
    method: string
    receivedOrigin: string | null
    contentType: string | null
    cookiePresent: boolean | null
    description: string
  }>
  count: number
}> {
  const url = `${CONFIG.backends[backendId]}/logs?limit=${limit}&origin=${encodeURIComponent(origin)}`
  const res = await fetch(url)
  return res.json()
}

/**
 * CSRF攻撃ログのカウントを取得
 */
export async function getCsrfAttackLogCount(backendId: BackendId, attackerOrigin: string): Promise<number> {
  const logs = await fetchLogs(backendId, attackerOrigin)
  return logs.logs.filter((log) => log.alertType === 'CSRF_ATTACK').length
}

/**
 * ブラウザインスタンスを作成
 */
export async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
  })
}

/**
 * 攻撃関数の型定義
 */
export type AttackFunction = (
  page: Page,
  targetBackend: string,
  endpoint: string
) => Promise<{ status: number; text: string; error?: string }>

/**
 * 新しいブラウザコンテキストを作成し、正規フロントエンドで /set-cookie にアクセスしてクッキーを取得
 * その後、攻撃者ページから攻撃を実行
 */
export async function setupAndAttack(
  browser: Browser,
  backendId: BackendId,
  attackerType: AttackerType,
  attackFn: AttackFunction,
  targetEndpoint: string = CONFIG.endpoints.corsSpecific
): Promise<{ context: BrowserContext; result: { status: number; text: string; error?: string } }> {
  const context = await browser.newContext()
  const page = await context.newPage()

  // Step 1: 正規フロントエンドにアクセスしてクッキーを取得
  const legitFrontend = CONFIG.legitFrontends[backendId]
  const backend = CONFIG.backends[backendId]

  console.log(`[Setup] Visiting legitimate frontend: ${legitFrontend}`)
  await page.goto(legitFrontend, { waitUntil: 'domcontentloaded' })

  // 正規フロントエンドからバックエンドの /set-cookie にリクエストを送信してクッキーを取得
  console.log(`[Setup] Fetching from backend to set cookie: ${backend}${CONFIG.endpoints.setCookie}`)
  const cookieResult = await page.evaluate(
    async ({ backendUrl, endpoint }) => {
      try {
        const res = await fetch(`${backendUrl}${endpoint}`, {
          method: 'GET',
          credentials: 'include',
        })
        const text = await res.text()
        return { status: res.status, text, error: undefined }
      } catch (e) {
        return { status: 0, text: '', error: String(e) }
      }
    },
    { backendUrl: backend, endpoint: CONFIG.endpoints.setCookie }
  )
  console.log(`[Setup] Cookie fetch result: status=${cookieResult.status}, error=${cookieResult.error || 'none'}`)

  // クッキーが設定されたことを確認
  const cookies = await context.cookies()
  console.log(`[Setup] Cookies after /set-cookie request:`, cookies.map((c) => `${c.name}=${c.value} (SameSite=${c.sameSite})`).join(', ') || 'none')

  // Step 2: 攻撃者ページに移動して攻撃を実行
  const attackerUrl = CONFIG.attackers[attackerType]
  console.log(`[Attack] Navigating to attacker page: ${attackerUrl}`)
  await page.goto(attackerUrl, { waitUntil: 'domcontentloaded' })

  // 攻撃実行
  const result = await attackFn(page, backend, targetEndpoint)
  console.log(`[Attack] Result: status=${result.status}, error=${result.error || 'none'}`)

  return { context, result }
}

/**
 * α: fetch API を用いた unsafe method (POST application/json) による CSRF 攻撃
 * application/json は Simple Request ではないため、CORS プリフライトが発生する
 */
export async function executeAlphaAttack(
  page: Page,
  targetBackend: string,
  endpoint: string
): Promise<{ status: number; text: string; error?: string }> {
  return page.evaluate(
    async ({ targetUrl }) => {
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ts: Date.now(), note: 'csrf attack attempt (alpha)' }),
          credentials: 'include',
        })
        const text = await res.text()
        return { status: res.status, text }
      } catch (e) {
        return { status: 0, text: '', error: String(e) }
      }
    },
    { targetUrl: `${targetBackend}${endpoint}` }
  )
}

/**
 * β: text/plain を用いた Simple Request による CSRF 攻撃
 * text/plain は Simple Request なので、CORS プリフライトなしで送信される
 */
export async function executeBetaAttack(
  page: Page,
  targetBackend: string,
  endpoint: string
): Promise<{ status: number; text: string; error?: string }> {
  return page.evaluate(
    async ({ targetUrl }) => {
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({ ts: Date.now(), note: 'csrf attack attempt (beta)' }),
          credentials: 'include',
        })
        const text = await res.text()
        return { status: res.status, text }
      } catch (e) {
        return { status: 0, text: '', error: String(e) }
      }
    },
    { targetUrl: `${targetBackend}${endpoint}` }
  )
}

/**
 * γ: fetch API を用いた safe method (GET) によるクロスサイト読み取り攻撃
 */
export async function executeGammaAttack(
  page: Page,
  targetBackend: string,
  endpoint: string
): Promise<{ status: number; text: string; error?: string }> {
  return page.evaluate(
    async ({ targetUrl }) => {
      try {
        const res = await fetch(targetUrl, {
          method: 'GET',
          credentials: 'include',
        })
        const text = await res.text()
        return { status: res.status, text }
      } catch (e) {
        return { status: 0, text: '', error: String(e) }
      }
    },
    { targetUrl: `${targetBackend}${endpoint}` }
  )
}
