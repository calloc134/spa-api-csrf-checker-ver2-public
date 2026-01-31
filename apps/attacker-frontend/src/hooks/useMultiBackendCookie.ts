import { useState, useCallback } from 'react'
import { callApi } from '../api'
import type { ApiResult } from '../types'

/**
 * 複数バックエンド対応のCookie取得状態管理フック
 */
export function useMultiBackendCookie() {
  const [results, setResults] = useState<Record<string, ApiResult | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const setCookie = useCallback(async (backendUrl: string, backendId: string) => {
    setLoading((prev) => ({ ...prev, [backendId]: true }))
    const res = await callApi(backendUrl, '/set-cookie', 'GET')
    setResults((prev) => ({ ...prev, [backendId]: res }))
    setLoading((prev) => ({ ...prev, [backendId]: false }))
    return res
  }, [])

  const getResult = useCallback(
    (backendId: string) => results[backendId] ?? null,
    [results]
  )

  const isLoading = useCallback(
    (backendId: string) => loading[backendId] ?? false,
    [loading]
  )

  return {
    setCookie,
    getResult,
    isLoading,
    results,
    loading,
  }
}
