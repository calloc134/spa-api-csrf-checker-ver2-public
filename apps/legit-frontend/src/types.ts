/**
 * API呼び出し結果の型
 */
export type ApiResult = {
  status: number
  text: string
  error?: string
}

/**
 * セキュリティログの型（バックエンドと同じ構造）
 */
export type SecurityLog = {
  id: number
  timestamp: string
  backendId: string | null
  alertType: string
  severity: string
  endpoint: string
  method: string
  expectedOrigin: string | null
  receivedOrigin: string | null
  referer: string | null
  secFetchSite: string | null
  contentType: string | null
  cookiePresent: boolean | null
  description: string
}

/**
 * ログ取得APIのレスポンス型
 */
export type LogsResponse = {
  ok: boolean
  logs: SecurityLog[]
  count: number
  backendId?: string
  error?: string
}

/**
 * エンドポイント定義の型
 */
export type EndpointConfig = {
  path: string
  name: string
}

/**
 * リクエストのキー生成用パラメータ
 */
export type RequestKey = {
  method: 'GET' | 'POST'
  endpoint: string
  contentType?: string
}
