import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { csrf } from 'hono/csrf'
import type { Bindings } from './types'
import {
  corsAny,
  corsSpecific,
  requireCookie,
  requestLogger,
  requireJsonContentType,
  requireValidOrigin,
} from './middleware'
import { jsonEcho, jsonEchoWithBody, isPotentialCsrfAttack } from './utils'
import { logPotentialCsrfAttack, getSecurityLogs } from './logger'

const app = new Hono<{ Bindings: Bindings }>()

// リクエストログミドルウェア
app.use('*', requestLogger)

/**
 * (α) 同居SPAのための "/" と、APIとしての "/" を両立させる
 */
app.get('/', async (c) => {
  const accept = c.req.header('accept') ?? ''
  const secFetchMode = c.req.header('sec-fetch-mode') ?? ''
  const looksLikeNavigation = secFetchMode === 'navigate' || accept.includes('text/html')

  if (looksLikeNavigation && c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw)
  }
  return jsonEcho(c)
})
app.post('/', (c) => jsonEchoWithBody(c))

// 1) /set-cookie（SameSite はデプロイ先で変更）
app.use('/set-cookie', (c, next) => corsSpecific(c.env.EXPECTED_ORIGIN)(c, next))
app.all('/set-cookie', (c) => {
  const sameSite = c.env.COOKIE_SAMESITE === 'None' ? 'None' : 'Lax'
  setCookie(c, c.env.COOKIE_NAME, c.env.COOKIE_VALUE, {
    httpOnly: true,
    secure: true,
    sameSite,
    path: '/',
    maxAge: 60 * 60,
  })
  return c.json({ ok: true, set: { name: c.env.COOKIE_NAME, sameSite } })
})

// 2) /cors-any（Allow-Origin:*）
app.use('/cors-any', corsAny)
app.get('/cors-any', (c) => jsonEcho(c, { cors: 'any(*)' }))
app.post('/cors-any', (c) => jsonEchoWithBody(c, { cors: 'any(*)' }))

// 3) /cors-specific（Allow-Origin: EXPECTED_ORIGIN + credentials）
// ミドルウェア順序: CORS → Cookie検証
app.use('/cors-specific', (c, next) => corsSpecific(c.env.EXPECTED_ORIGIN)(c, next))
app.use('/cors-specific', requireCookie)
app.get('/cors-specific', (c) => {
  return jsonEcho(c, { cors: 'specific', expected: c.env.EXPECTED_ORIGIN })
})
app.post('/cors-specific', async (c) => {
  if (isPotentialCsrfAttack(c, c.env.EXPECTED_ORIGIN)) {
    await logPotentialCsrfAttack(c, '/cors-specific', c.env.EXPECTED_ORIGIN, 'unsafe_method_with_invalid_origin')
  }
  return jsonEchoWithBody(c, { cors: 'specific', expected: c.env.EXPECTED_ORIGIN })
})

// 4) /cors-specific-content-type（3 + Content-Type=application/json のみ）
// ミドルウェア順序: CORS → Cookie検証 → Content-Type検証
app.use('/cors-specific-content-type', (c, next) => corsSpecific(c.env.EXPECTED_ORIGIN)(c, next))
app.use('/cors-specific-content-type', requireCookie)
app.use('/cors-specific-content-type', requireJsonContentType)
app.get('/cors-specific-content-type', (c) => {
  return jsonEcho(c, { cors: 'specific+content-type', expected: c.env.EXPECTED_ORIGIN })
})
app.post('/cors-specific-content-type', async (c) => {
  if (isPotentialCsrfAttack(c, c.env.EXPECTED_ORIGIN)) {
    await logPotentialCsrfAttack(c, '/cors-specific-content-type', c.env.EXPECTED_ORIGIN, 'unsafe_method_with_invalid_origin')
  }
  return jsonEchoWithBody(c, { cors: 'specific+content-type', expected: c.env.EXPECTED_ORIGIN })
})

// 5) /cors-specific-content-type-origin（4 + Origin 検証）
// ミドルウェア順序: CORS → Cookie検証 → Content-Type検証 → Origin検証
app.use('/cors-specific-content-type-origin', (c, next) => corsSpecific(c.env.EXPECTED_ORIGIN)(c, next))
app.use('/cors-specific-content-type-origin', requireCookie)
app.use('/cors-specific-content-type-origin', requireJsonContentType)
app.use('/cors-specific-content-type-origin', requireValidOrigin)
app.get('/cors-specific-content-type-origin', (c) => {
  return jsonEcho(c, { cors: 'specific+content-type+origin', expected: c.env.EXPECTED_ORIGIN })
})
app.post('/cors-specific-content-type-origin', async (c) => {
  // CSRF攻撃検出（Origin検証後なので通常は発生しない）
  if (isPotentialCsrfAttack(c, c.env.EXPECTED_ORIGIN)) {
    await logPotentialCsrfAttack(c, '/cors-specific-content-type-origin', c.env.EXPECTED_ORIGIN, 'unsafe_method_with_invalid_origin')
  }
  return jsonEchoWithBody(c, { cors: 'specific+content-type+origin', expected: c.env.EXPECTED_ORIGIN })
})

// 6) /cors-specific-csrf（hono/csrf ミドルウェアを使用したCSRF保護）
// ミドルウェア順序: CORS → Cookie検証 → hono/csrf
// Origin検証とContent-Type検証は hono/csrf が内部で行う
app.use('/cors-specific-csrf', (c, next) => corsSpecific(c.env.EXPECTED_ORIGIN)(c, next))
app.use('/cors-specific-csrf', requireCookie)
app.use('/cors-specific-csrf', (c, next) => {
  // hono/csrf ミドルウェアを動的に設定
  // EXPECTED_ORIGINを許可オリジンとして設定
  return csrf({ origin: c.env.EXPECTED_ORIGIN })(c, next)
})
app.get('/cors-specific-csrf', (c) => {
  return jsonEcho(c, { cors: 'specific+csrf', expected: c.env.EXPECTED_ORIGIN })
})
app.post('/cors-specific-csrf', async (c) => {
  // hono/csrf を通過したリクエストはCSRF攻撃ではない
  // ただし、ログ目的で不正なリクエストを記録
  if (isPotentialCsrfAttack(c, c.env.EXPECTED_ORIGIN)) {
    await logPotentialCsrfAttack(c, '/cors-specific-csrf', c.env.EXPECTED_ORIGIN, 'unsafe_method_with_invalid_origin')
  }
  return jsonEchoWithBody(c, { cors: 'specific+csrf', expected: c.env.EXPECTED_ORIGIN })
})

// 7) /logs（セキュリティログ閲覧、CORS: *、Cookie不要）
// 自身のバックエンドIDでフィルタリング、オプションでoriginでも絞り込み可能
app.use('/logs', corsAny)
app.get('/logs', async (c) => {
  if (!c.env.DB) {
    return c.json({ ok: false, error: 'D1 not configured for this backend' }, 400)
  }
  const limitParam = c.req.query('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 500) : 100
  const backendId = c.env.BACKEND_ID // 自身のバックエンドIDでフィルタリング
  const origin = c.req.query('origin') // オプション: 発信元オリジンでフィルタリング
  const logs = await getSecurityLogs(c.env.DB, limit, backendId, origin)
  return c.json({ ok: true, logs, count: logs.length, backendId, origin: origin || null })
})

// 静的アセットへのフォールバック（Backend A のみ）
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw)
  }
  return c.json({ ok: false, error: 'not_found' }, 404)
})

export default app
