import type { Next } from 'hono'
import type { AppContext } from '../types'
import { logRequest } from '../logger'

/**
 * リクエストログミドルウェア
 * すべてのリクエストの情報をログ出力する
 */
export const requestLogger = async (c: AppContext, next: Next) => {
  logRequest(c)
  await next()
}
