import type { Next } from 'hono'
import type { AppContext } from '../types'
import { logOriginValidationFailure } from '../logger'

/**
 * Origin検証ミドルウェア
 * Originヘッダが期待値と一致しない場合は403を返す
 */
export const requireValidOrigin = async (c: AppContext, next: Next) => {
  const endpoint = new URL(c.req.url).pathname
  const expected = c.env.EXPECTED_ORIGIN
  const reqOrigin = c.req.header('origin')
  const urlOrigin = new URL(c.req.url).origin

  // Originヘッダがある場合はそれを使用、ない場合はURLのオリジンと比較
  const ok = reqOrigin ? reqOrigin === expected : urlOrigin === expected

  if (!ok) {
    await logOriginValidationFailure(c, endpoint, expected)
    return c.json({
      ok: false,
      error: 'origin_mismatch',
      expected,
      got: reqOrigin ?? null,
    }, 403)
  }

  await next()
}
