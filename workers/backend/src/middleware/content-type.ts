import type { Next } from 'hono'
import type { AppContext } from '../types'
import { logContentTypeValidationFailure } from '../logger'

/**
 * Content-Type検証ミドルウェア
 * POSTリクエストでContent-Typeがapplication/jsonでない場合は415を返す
 * GETリクエストはスキップ
 */
export const requireJsonContentType = async (c: AppContext, next: Next) => {
  // GETやOPTIONSなどはスキップ
  if (c.req.method === 'GET' || c.req.method === 'OPTIONS' || c.req.method === 'HEAD') {
    return next()
  }

  const endpoint = new URL(c.req.url).pathname
  const ct = (c.req.header('content-type') ?? '').toLowerCase()

  if (!ct.startsWith('application/json')) {
    await logContentTypeValidationFailure(c, endpoint, 'application/json')
    return c.json({
      ok: false,
      error: 'unsupported_content_type',
      got: ct,
    }, 415)
  }

  await next()
}
