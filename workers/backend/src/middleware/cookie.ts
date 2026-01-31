import type { Next } from 'hono'
import { getCookie } from 'hono/cookie'
import type { AppContext } from '../types'
import { logCookieValidationFailure } from '../logger'

/**
 * Cookie検証ミドルウェア
 * 正しいCookieが付属していない場合は401 Unauthorizedを返す
 * Content-Type検証・Origin検証の前に実行される
 */
export const requireCookie = async (c: AppContext, next: Next) => {
  const cookieName = c.env.COOKIE_NAME
  const expectedValue = c.env.COOKIE_VALUE
  const endpoint = new URL(c.req.url).pathname

  // hono/cookie helperを使用してCookieを取得
  const cookieValue = getCookie(c, cookieName)

  if (!cookieValue || cookieValue !== expectedValue) {
    // Cookie検証失敗ログ
    await logCookieValidationFailure(c, endpoint, cookieName)
    return c.json({
      ok: false,
      error: 'unauthorized',
      message: 'Valid authentication cookie required',
      cookieName,
      received: cookieValue ?? null,
    }, 401)
  }

  await next()
}
