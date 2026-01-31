import { createConsola } from 'consola'
import { drizzle } from 'drizzle-orm/d1'
import { desc, eq, and } from 'drizzle-orm'
import type { AppContext } from './types'
import { securityLogs, type NewSecurityLog, type SecurityLog } from './db/schema'

/**
 * アプリケーション用ロガー
 */
export const logger = createConsola({
  formatOptions: {
    date: true,
    colors: true,
    compact: false,
  },
})

/**
 * D1にセキュリティログを保存
 */
async function saveSecurityLog(c: AppContext, log: NewSecurityLog): Promise<void> {
  if (!c.env.DB) {
    logger.debug('DB binding not available, skipping D1 save')
    return
  }
  try {
    const db = drizzle(c.env.DB)
    await db.insert(securityLogs).values(log)
    logger.debug('Security log saved to D1')
  } catch (error) {
    logger.error('Failed to save security log to D1:', error)
  }
}

/**
 * D1からセキュリティログを取得
 * @param db D1Database
 * @param limit 取得件数
 * @param backendId バックエンドIDでフィルタリング（省略時は全件）
 * @param origin 発信元オリジンでフィルタリング（省略時はフィルタなし）
 */
export async function getSecurityLogs(
  db: D1Database,
  limit = 100,
  backendId?: string,
  origin?: string
): Promise<SecurityLog[]> {
  const drizzleDb = drizzle(db)
  
  // 条件を組み立て
  const conditions = []
  if (backendId) {
    conditions.push(eq(securityLogs.backendId, backendId))
  }
  if (origin) {
    conditions.push(eq(securityLogs.receivedOrigin, origin))
  }
  
  if (conditions.length > 0) {
    return drizzleDb
      .select()
      .from(securityLogs)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(securityLogs.id))
      .limit(limit)
  }
  
  return drizzleDb
    .select()
    .from(securityLogs)
    .orderBy(desc(securityLogs.id))
    .limit(limit)
}

/**
 * リクエスト情報を抽出するヘルパー
 */
function extractRequestInfo(c: AppContext) {
  const r = c.req.raw
  return {
    method: r.method,
    origin: r.headers.get('Origin'),
    referer: r.headers.get('Referer'),
    secFetchSite: r.headers.get('Sec-Fetch-Site'),
    secFetchMode: r.headers.get('Sec-Fetch-Mode'),
    contentType: r.headers.get('Content-Type'),
    cookie: r.headers.get('Cookie'),
  }
}

/**
 * リクエストログを出力
 */
export function logRequest(c: AppContext) {
  const u = new URL(c.req.url)
  const info = extractRequestInfo(c)

  logger.info({
    message: `${info.method} ${u.pathname}`,
    ...info,
  })
}

/**
 * CSRF攻撃検出ログ
 */
export async function logPotentialCsrfAttack(
  c: AppContext,
  endpoint: string,
  expectedOrigin: string,
  reason: 'unsafe_method_with_invalid_origin'
) {
  const r = c.req.raw
  const reqOrigin = r.headers.get('Origin')
  const referer = r.headers.get('Referer')
  const secFetchSite = r.headers.get('Sec-Fetch-Site')
  const cookie = r.headers.get('Cookie')
  const contentType = r.headers.get('Content-Type')
  const backendId = c.env.BACKEND_ID

  logger.error({
    message: 'CSRF ATTACK DETECTED',
    alert: 'POTENTIAL_CSRF_ATTACK',
    severity: 'CRITICAL',
    backendId,
    endpoint,
    reason,
    details: {
      method: r.method,
      expectedOrigin,
      receivedOrigin: reqOrigin,
      referer,
      secFetchSite,
      cookiePresent: !!cookie,
    },
    description: 'CSRF防御ミドルウェアを通過して不正なリクエストがハンドラに到達しました',
  })

  // D1に保存
  await saveSecurityLog(c, {
    timestamp: new Date().toISOString(),
    backendId,
    alertType: 'CSRF_ATTACK',
    severity: 'CRITICAL',
    endpoint,
    method: r.method,
    expectedOrigin,
    receivedOrigin: reqOrigin,
    referer,
    secFetchSite,
    contentType,
    cookiePresent: !!cookie,
    description: 'CSRF防御ミドルウェアを通過して不正なリクエストがハンドラに到達しました',
  })
}

/**
 * Content-Type検証失敗ログ
 */
export async function logContentTypeValidationFailure(
  c: AppContext,
  endpoint: string,
  expectedContentType: string
) {
  const r = c.req.raw
  const gotContentType = r.headers.get('Content-Type')
  const reqOrigin = r.headers.get('Origin')
  const referer = r.headers.get('Referer')
  const secFetchSite = r.headers.get('Sec-Fetch-Site')
  const cookie = r.headers.get('Cookie')
  const backendId = c.env.BACKEND_ID

  logger.warn({
    message: 'Content-Type Validation Failed',
    alert: 'CONTENT_TYPE_VALIDATION_FAILURE',
    severity: 'WARNING',
    backendId,
    endpoint,
    details: {
      method: r.method,
      expectedContentType,
      receivedContentType: gotContentType,
      origin: reqOrigin,
    },
    description: 'Content-Type検証に失敗しました。不正なリクエストの可能性があります',
  })

  // D1に保存
  await saveSecurityLog(c, {
    timestamp: new Date().toISOString(),
    backendId,
    alertType: 'CONTENT_TYPE_VALIDATION_FAILURE',
    severity: 'WARNING',
    endpoint,
    method: r.method,
    expectedOrigin: expectedContentType, // reuse field for expected value
    receivedOrigin: reqOrigin,
    referer,
    secFetchSite,
    contentType: gotContentType,
    cookiePresent: !!cookie,
    description: 'Content-Type検証に失敗しました。不正なリクエストの可能性があります',
  })
}

/**
 * Origin検証失敗ログ
 */
export async function logOriginValidationFailure(
  c: AppContext,
  endpoint: string,
  expectedOrigin: string
) {
  const r = c.req.raw
  const gotOrigin = r.headers.get('Origin')
  const referer = r.headers.get('Referer')
  const secFetchSite = r.headers.get('Sec-Fetch-Site')
  const contentType = r.headers.get('Content-Type')
  const cookie = r.headers.get('Cookie')
  const backendId = c.env.BACKEND_ID

  logger.warn({
    message: 'Origin Validation Failed',
    alert: 'ORIGIN_VALIDATION_FAILURE',
    severity: 'WARNING',
    backendId,
    endpoint,
    details: {
      method: r.method,
      expectedOrigin,
      receivedOrigin: gotOrigin,
      referer,
      secFetchSite,
    },
    description: 'Origin検証に失敗しました。不正なリクエストの可能性があります',
  })

  // D1に保存
  await saveSecurityLog(c, {
    timestamp: new Date().toISOString(),
    backendId,
    alertType: 'ORIGIN_VALIDATION_FAILURE',
    severity: 'WARNING',
    endpoint,
    method: r.method,
    expectedOrigin,
    receivedOrigin: gotOrigin,
    referer,
    secFetchSite,
    contentType,
    cookiePresent: !!cookie,
    description: 'Origin検証に失敗しました。不正なリクエストの可能性があります',
  })
}

/**
 * Cookie検証失敗ログ
 */
export async function logCookieValidationFailure(
  c: AppContext,
  endpoint: string,
  cookieName: string
) {
  const r = c.req.raw
  const reqOrigin = r.headers.get('Origin')
  const rawCookie = r.headers.get('Cookie')
  const referer = r.headers.get('Referer')
  const secFetchSite = r.headers.get('Sec-Fetch-Site')
  const contentType = r.headers.get('Content-Type')
  const backendId = c.env.BACKEND_ID

  logger.warn({
    message: 'Cookie Validation Failed',
    alert: 'COOKIE_VALIDATION_FAILURE',
    severity: 'WARNING',
    backendId,
    endpoint,
    details: {
      method: r.method,
      expectedCookieName: cookieName,
      cookieHeaderPresent: !!rawCookie,
      origin: reqOrigin,
    },
    description: 'Cookie検証に失敗しました。認証されていないリクエストです',
  })

  // D1に保存
  await saveSecurityLog(c, {
    timestamp: new Date().toISOString(),
    backendId,
    alertType: 'COOKIE_VALIDATION_FAILURE',
    severity: 'WARNING',
    endpoint,
    method: r.method,
    expectedOrigin: cookieName, // reuse field for expected cookie name
    receivedOrigin: reqOrigin,
    referer,
    secFetchSite,
    contentType,
    cookiePresent: !!rawCookie,
    description: 'Cookie検証に失敗しました。認証されていないリクエストです',
  })
}
