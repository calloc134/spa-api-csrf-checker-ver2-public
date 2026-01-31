/**
 * CSRF攻撃防御テスト - 保護されたエンドポイント (/cors-specific-csrf)
 *
 * このテストでは、hono/csrf ミドルウェアで保護されたエンドポイントに対する
 * CSRF攻撃がすべて防御されることを検証します。
 *
 * hono/csrf ミドルウェアの動作:
 * - Origin ヘッダーと Sec-Fetch-Site ヘッダーをチェック
 * - unsafe method (POST等) かつ Simple Request Content-Type の場合にのみ検証
 * - どちらかの検証がパスすればリクエストを許可
 *
 * テスト対象のバックエンド：
 * - Backend A: 完全同一オリジン用 / SameSite=Lax
 * - Backend B: サブドメイン用 / SameSite=Lax + Access-Control-Allow-Credentials
 * - Backend C: 完全別ドメイン用 / SameSite=None + Access-Control-Allow-Credentials
 *
 * 期待される結果:
 * すべての攻撃パターンで CSRF 攻撃が防御される
 * - α (POST application/json): CORS プリフライトでブロック
 * - β (POST text/plain): hono/csrf が Origin/Sec-Fetch-Site を検証してブロック
 * - γ (GET): 読み取り攻撃は SOP によりブロック
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import type { Browser } from 'playwright'
import {
  CONFIG,
  createBrowser,
  setupAndAttack,
  executeAlphaAttack,
  executeBetaAttack,
  executeGammaAttack,
} from './setup'

describe('CSRF攻撃防御テスト - 保護されたエンドポイント (/cors-specific-csrf)', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await createBrowser()
  })

  afterAll(async () => {
    await browser.close()
  })

  /**
   * =====================================
   * α: POST application/json CSRF攻撃
   * =====================================
   *
   * 期待される結果: CORS プリフライトでブロックされる
   * （/cors-specific と同様の防御）
   */
  describe('α. fetch API unsafe method (POST application/json) CSRF攻撃', () => {
    describe('Backend A (完全同一オリジン / SameSite=Lax) への攻撃', () => {
      test('サブドメイン攻撃者からの攻撃 → SOP (CORS) により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'A',
          'subdomain',
          executeAlphaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          const isBlocked = !!result.error || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })

      test('完全別ドメイン攻撃者からの攻撃 → SOP (CORS) + SameSite により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'A',
          'differentDomain',
          executeAlphaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          const isBlocked = !!result.error || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })
    })

    describe('Backend B (サブドメイン / SameSite=Lax + Allow-Credentials) への攻撃', () => {
      test('サブドメイン攻撃者からの攻撃 → SOP (CORS) により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'B',
          'subdomain',
          executeAlphaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          const isBlocked = !!result.error || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })

      test('完全別ドメイン攻撃者からの攻撃 → SOP (CORS) + SameSite により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'B',
          'differentDomain',
          executeAlphaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          const isBlocked = !!result.error || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })
    })

    describe('Backend C (完全別ドメイン / SameSite=None + Allow-Credentials) への攻撃', () => {
      test('サブドメイン攻撃者からの攻撃 → SOP (CORS) により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'C',
          'subdomain',
          executeAlphaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          const isBlocked = !!result.error || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })

      test('完全別ドメイン攻撃者からの攻撃 → SOP (CORS) により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'C',
          'differentDomain',
          executeAlphaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          const isBlocked = !!result.error || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })
    })
  })

  /**
   * =====================================
   * β: POST text/plain (Simple Request) CSRF攻撃
   * =====================================
   *
   * 期待される結果: hono/csrf ミドルウェアにより全て防御される
   * - Origin ヘッダーが EXPECTED_ORIGIN と一致しない
   * - Sec-Fetch-Site が cross-site
   * → 403 Forbidden でブロック
   *
   * これが /cors-specific との違い:
   * /cors-specific では β 攻撃が成功していたが、
   * /cors-specific-csrf では hono/csrf により防御される
   */
  describe('β. Simple Request (POST text/plain) CSRF攻撃', () => {
    describe('Backend A (完全同一オリジン / SameSite=Lax) への攻撃', () => {
      test('サブドメイン攻撃者からの攻撃 → hono/csrf により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'A',
          'subdomain',
          executeBetaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[β-A-subdomain-csrf] Result: status=${result.status}, error=${result.error || 'none'}`)
          // hono/csrf が 403 Forbidden を返すか、CORS エラーでブロックされるはず
          // Simple Request なのでリクエストは送信されるが、hono/csrf が Origin を検証して 403 を返す
          // ただし、SOP により攻撃者はレスポンスを読めないので、result.error になる可能性もある
          const isBlocked = !!result.error || result.status === 403 || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })

      test('完全別ドメイン攻撃者からの攻撃 → hono/csrf + SameSite により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'A',
          'differentDomain',
          executeBetaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[β-A-differentDomain-csrf] Result: status=${result.status}, error=${result.error || 'none'}`)
          // SameSite=Lax によりクッキーが送信されない + hono/csrf による保護
          const isBlocked = !!result.error || result.status === 403 || result.status === 401 || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })
    })

    describe('Backend B (サブドメイン / SameSite=Lax + Allow-Credentials) への攻撃', () => {
      test('サブドメイン攻撃者からの攻撃 → hono/csrf により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'B',
          'subdomain',
          executeBetaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[β-B-subdomain-csrf] Result: status=${result.status}, error=${result.error || 'none'}`)
          const isBlocked = !!result.error || result.status === 403 || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })

      test('完全別ドメイン攻撃者からの攻撃 → hono/csrf + SameSite により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'B',
          'differentDomain',
          executeBetaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[β-B-differentDomain-csrf] Result: status=${result.status}, error=${result.error || 'none'}`)
          const isBlocked = !!result.error || result.status === 403 || result.status === 401 || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })
    })

    describe('Backend C (完全別ドメイン / SameSite=None + Allow-Credentials) への攻撃', () => {
      test('サブドメイン攻撃者からの攻撃 → hono/csrf により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'C',
          'subdomain',
          executeBetaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[β-C-subdomain-csrf] Result: status=${result.status}, error=${result.error || 'none'}`)
          // SameSite=None でもクッキーが送信されても、hono/csrf が Origin を検証して 403 を返す
          const isBlocked = !!result.error || result.status === 403 || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })

      test('完全別ドメイン攻撃者からの攻撃 → hono/csrf により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'C',
          'differentDomain',
          executeBetaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[β-C-differentDomain-csrf] Result: status=${result.status}, error=${result.error || 'none'}`)
          // SameSite=None でクッキーが送信されても、hono/csrf が Origin を検証して 403 を返す
          const isBlocked = !!result.error || result.status === 403 || result.status === 0
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })
    })
  })

  /**
   * =====================================
   * γ: GET (safe method) クロスサイト読み取り攻撃
   * =====================================
   *
   * 期待される結果: SOP (CORS) によりレスポンスが読み取れない
   * （/cors-specific と同様の防御）
   */
  describe('γ. fetch API safe method (GET) クロスサイト読み取り攻撃', () => {
    describe('Backend A (完全同一オリジン / SameSite=Lax) への攻撃', () => {
      test('サブドメイン攻撃者からの攻撃 → SOP によりレスポンスが読み取れない', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'A',
          'subdomain',
          executeGammaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[γ-A-subdomain-csrf] Result: status=${result.status}, text=${result.text.substring(0, 50)}..., error=${result.error || 'none'}`)
          const isBlocked = !!result.error || result.status === 0 || result.text === ''
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })

      test('完全別ドメイン攻撃者からの攻撃 → SOP + SameSite により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'A',
          'differentDomain',
          executeGammaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[γ-A-differentDomain-csrf] Result: status=${result.status}, text=${result.text.substring(0, 50)}..., error=${result.error || 'none'}`)
          const isBlocked = !!result.error || result.status === 0 || result.text === ''
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })
    })

    describe('Backend B (サブドメイン / SameSite=Lax + Allow-Credentials) への攻撃', () => {
      test('サブドメイン攻撃者からの攻撃 → SOP によりレスポンスが読み取れない', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'B',
          'subdomain',
          executeGammaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[γ-B-subdomain-csrf] Result: status=${result.status}, text=${result.text.substring(0, 50)}..., error=${result.error || 'none'}`)
          const isBlocked = !!result.error || result.status === 0 || result.text === ''
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })

      test('完全別ドメイン攻撃者からの攻撃 → SOP + SameSite により防御される', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'B',
          'differentDomain',
          executeGammaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[γ-B-differentDomain-csrf] Result: status=${result.status}, text=${result.text.substring(0, 50)}..., error=${result.error || 'none'}`)
          const isBlocked = !!result.error || result.status === 0 || result.text === ''
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })
    })

    describe('Backend C (完全別ドメイン / SameSite=None + Allow-Credentials) への攻撃', () => {
      test('サブドメイン攻撃者からの攻撃 → SOP によりレスポンスが読み取れない', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'C',
          'subdomain',
          executeGammaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[γ-C-subdomain-csrf] Result: status=${result.status}, text=${result.text.substring(0, 50)}..., error=${result.error || 'none'}`)
          const isBlocked = !!result.error || result.status === 0 || result.text === ''
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })

      test('完全別ドメイン攻撃者からの攻撃 → SOP によりレスポンスが読み取れない', async () => {
        const { context, result } = await setupAndAttack(
          browser,
          'C',
          'differentDomain',
          executeGammaAttack,
          CONFIG.endpoints.corsSpecificCsrf
        )
        try {
          console.log(`[γ-C-differentDomain-csrf] Result: status=${result.status}, text=${result.text.substring(0, 50)}..., error=${result.error || 'none'}`)
          const isBlocked = !!result.error || result.status === 0 || result.text === ''
          expect(isBlocked).toBe(true)
        } finally {
          await context.close()
        }
      })
    })
  })
})
