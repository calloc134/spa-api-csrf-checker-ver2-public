import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * セキュリティログテーブル
 * ミドルウェアのエラーメッセージやCSRF攻撃検出を記録
 */
export const securityLogs = sqliteTable('security_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: text('timestamp').notNull(),
  backendId: text('backend_id'), // A, B, C - どのバックエンドからのログか識別
  alertType: text('alert_type').notNull(), // CSRF_ATTACK, COOKIE_VALIDATION_FAILURE, CONTENT_TYPE_VALIDATION_FAILURE, ORIGIN_VALIDATION_FAILURE
  severity: text('severity').notNull(), // CRITICAL, WARNING
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  expectedOrigin: text('expected_origin'),
  receivedOrigin: text('received_origin'),
  referer: text('referer'),
  secFetchSite: text('sec_fetch_site'),
  contentType: text('content_type'),
  cookiePresent: integer('cookie_present', { mode: 'boolean' }),
  description: text('description').notNull(),
})

export type SecurityLog = typeof securityLogs.$inferSelect
export type NewSecurityLog = typeof securityLogs.$inferInsert
