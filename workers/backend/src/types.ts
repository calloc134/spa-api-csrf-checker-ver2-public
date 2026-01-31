import type { Context } from 'hono'

/**
 * Cloudflare Workers バインディング型定義
 */
export type Bindings = {
  EXPECTED_ORIGIN: string
  COOKIE_SAMESITE: 'Lax' | 'None'
  COOKIE_NAME: string
  COOKIE_VALUE: string
  BACKEND_ID: string // A, B, C - バックエンド識別子
  ASSETS?: Fetcher
  DB?: D1Database // D1 database for security logs
}

/**
 * アプリケーション用のContext型
 */
export type AppContext = Context<{ Bindings: Bindings }>

/**
 * Unsafe methods (CSRF攻撃対象となる状態変更を伴うメソッド)
 */
export const UNSAFE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'] as const
