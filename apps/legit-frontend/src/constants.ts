import type { EndpointConfig } from './types'

/**
 * API Base URL（環境変数から取得）
 */
export const API_BASE = import.meta.env.VITE_API_BASE || ''

/**
 * テスト対象のエンドポイント一覧
 */
export const ENDPOINTS: EndpointConfig[] = [
  { path: '/', name: 'ルート (/)' },
  { path: '/cors-any', name: 'CORS Any (/cors-any)' },
  { path: '/cors-specific', name: 'CORS Specific (/cors-specific)' },
  { path: '/cors-specific-content-type', name: 'CORS + Content-Type (/cors-specific-content-type)' },
  { path: '/cors-specific-content-type-origin', name: 'CORS + CT + Origin検証 (/cors-specific-content-type-origin)' },
]

/**
 * React Query のキー
 */
export const QUERY_KEYS = {
  logs: (backendId: string) => ['logs', backendId] as const,
} as const
