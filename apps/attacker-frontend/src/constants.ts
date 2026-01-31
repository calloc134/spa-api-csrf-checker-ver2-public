import type { EndpointConfig, BackendConfig } from './types'

/**
 * 攻撃対象のバックエンドURL一覧
 */
export const API_A = import.meta.env.VITE_API_A || ''
export const API_B = import.meta.env.VITE_API_B || ''
export const API_C = import.meta.env.VITE_API_C || ''

/**
 * バックエンド設定一覧
 */
export const BACKENDS: BackendConfig[] = [
  { id: 'A', name: 'Backend A (同一オリジン用 / SameSite=Lax)', url: API_A },
  { id: 'B', name: 'Backend B (サブドメイン用 / SameSite=Lax)', url: API_B },
  { id: 'C', name: 'Backend C (別ドメイン用 / SameSite=None)', url: API_C },
]

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
 * ログ取得用のバックエンドURL一覧
 * 全バックエンドでD1が設定されている
 */
export const LOG_BACKENDS = {
  A: API_A || 'https://csrf-backend-a.calloc134personal.workers.dev',
  B: API_B || 'https://csrf-backend-b.calloc134personal.workers.dev',
  C: API_C || 'https://csrf-backend-c.calloc134personal.workers.dev',
} as const

/**
 * React Query のキー
 */
export const QUERY_KEYS = {
  logs: (backendId: string) => ['logs', backendId] as const,
} as const
