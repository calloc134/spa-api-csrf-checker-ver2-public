import type { AppContext } from './types'
import { UNSAFE_METHODS } from './types'

/**
 * リクエストの受信情報を構造化して返す
 */
export function getReceivedInfo(c: AppContext) {
  const r = c.req.raw
  return {
    origin: r.headers.get('Origin'),
    referer: r.headers.get('Referer'),
    cookie: r.headers.get('Cookie'),
    contentType: r.headers.get('Content-Type'),
    secFetchSite: r.headers.get('Sec-Fetch-Site'),
    secFetchMode: r.headers.get('Sec-Fetch-Mode'),
  }
}

/**
 * JSONエコーレスポンス (GET用)
 */
export function jsonEcho(c: AppContext, extra: Record<string, unknown> = {}) {
  const u = new URL(c.req.url)
  return c.json({
    ok: true,
    endpoint: u.pathname,
    method: c.req.method,
    received: getReceivedInfo(c),
    ...extra,
  })
}

/**
 * JSONエコーレスポンス (POST用: ボディをパースして返す)
 */
export async function jsonEchoWithBody(c: AppContext, extra: Record<string, unknown> = {}) {
  const u = new URL(c.req.url)

  let body: unknown = null
  let bodyError: string | null = null

  try {
    body = await c.req.json()
  } catch (e) {
    bodyError = e instanceof Error ? e.message : 'Failed to parse JSON'
  }

  return c.json({
    ok: bodyError === null,
    endpoint: u.pathname,
    method: c.req.method,
    received: getReceivedInfo(c),
    body,
    bodyError,
    ...extra,
  })
}

/**
 * CSRF攻撃かどうかを判定（unsafe method + 不正なオリジン）
 */
export function isPotentialCsrfAttack(c: AppContext, expectedOrigin: string): boolean {
  const r = c.req.raw
  const method = r.method
  const reqOrigin = r.headers.get('Origin')
  const urlOrigin = new URL(r.url).origin

  // safe methodの場合はCSRF攻撃ではない
  if (!UNSAFE_METHODS.includes(method as typeof UNSAFE_METHODS[number])) {
    return false
  }

  // オリジン検証
  // Originヘッダがある場合はそれを使用、ない場合はURLのオリジンと比較
  const originToCheck = reqOrigin ?? urlOrigin
  const isValidOrigin = originToCheck === expectedOrigin

  return !isValidOrigin
}

/**
 * Originが正規かどうかを検証
 */
export function validateOrigin(c: AppContext, expectedOrigin: string): {
  ok: boolean
  receivedOrigin: string | null
} {
  const reqOrigin = c.req.header('origin')
  const urlOrigin = new URL(c.req.url).origin
  const ok = reqOrigin ? reqOrigin === expectedOrigin : urlOrigin === expectedOrigin

  return {
    ok,
    receivedOrigin: reqOrigin ?? null,
  }
}

/**
 * Content-Typeがapplication/jsonで始まるかを検証
 */
export function validateContentType(c: AppContext): {
  ok: boolean
  receivedContentType: string
} {
  const ct = (c.req.header('content-type') ?? '').toLowerCase()
  return {
    ok: ct.startsWith('application/json'),
    receivedContentType: ct,
  }
}
