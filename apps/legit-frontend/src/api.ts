import type { ApiResult, LogsResponse } from './types'

// Re-export types for backwards compatibility
export type { ApiResult, LogsResponse } from './types'

/**
 * API呼び出しのユーティリティ関数
 */
export async function callApi(
  base: string,
  path: string,
  method: 'GET' | 'POST',
  contentType?: string
): Promise<ApiResult> {
  const url = `${base}${path}`
  const headers: Record<string, string> = {}
  let body: string | undefined

  if (method === 'POST') {
    const ct = contentType ?? 'application/json'
    headers['Content-Type'] = ct
    body =
      ct === 'application/json'
        ? JSON.stringify({ ts: Date.now(), note: 'csrf poc' })
        : JSON.stringify({ ts: Date.now(), note: 'csrf poc (sent as text/plain)' })
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      credentials: 'include',
    })
    const text = await res.text()
    return { status: res.status, text }
  } catch (e) {
    return { status: 0, text: '', error: String(e) }
  }
}

/**
 * セキュリティログを取得
 * @param baseUrl バックエンドのベースURL
 * @param limit 取得件数
 * @param origin オプション: 発信元オリジンでフィルタリング
 */
export async function fetchLogs(
  baseUrl: string,
  limit = 100,
  origin?: string
): Promise<LogsResponse> {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    if (origin) {
      params.set('origin', origin)
    }
    const res = await fetch(`${baseUrl}/logs?${params}`)
    if (!res.ok) {
      return { ok: false, logs: [], count: 0, error: `HTTP ${res.status}` }
    }
    return await res.json()
  } catch (e) {
    return { ok: false, logs: [], count: 0, error: String(e) }
  }
}

/**
 * リクエストのキーを生成（ステート管理用）
 */
export function getRequestKey(method: string, endpoint: string, contentType?: string): string {
  const ct = contentType === 'text/plain' ? 'text/plain' : 'json'
  return `${method}-${endpoint}-${ct}`
}
