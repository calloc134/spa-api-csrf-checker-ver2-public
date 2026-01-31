import { useState, useCallback } from 'react'
import { callApi } from '../api'
import type { ApiResult } from '../types'

/**
 * Cookie取得の状態管理フック
 */
export function useCookie(apiBase: string) {
  const [result, setResult] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)

  const setCookie = useCallback(async () => {
    setLoading(true)
    const res = await callApi(apiBase, '/set-cookie', 'GET')
    setResult(res)
    setLoading(false)
    return res
  }, [apiBase])

  return {
    result,
    loading,
    setCookie,
  }
}
