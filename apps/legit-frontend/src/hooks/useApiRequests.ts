import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { callApi, getRequestKey } from '../api'
import { QUERY_KEYS } from '../constants'
import type { ApiResult } from '../types'

type RequestState = {
  results: Record<string, ApiResult | null>
  loading: Record<string, boolean>
}

/**
 * APIリクエストの状態管理フック
 */
export function useApiRequests(apiBase: string) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<RequestState>({
    results: {},
    loading: {},
  })

  const handleRequest = useCallback(
    async (endpoint: string, method: 'GET' | 'POST', contentType?: string) => {
      const key = getRequestKey(method, endpoint, contentType)
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, [key]: true },
      }))

      const result = await callApi(apiBase, endpoint, method, contentType)

      setState((prev) => ({
        results: { ...prev.results, [key]: result },
        loading: { ...prev.loading, [key]: false },
      }))

      // リクエスト完了後、ログのキャッシュを即座にinvalidate
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.logs('current') })

      return result
    },
    [apiBase, queryClient]
  )

  const getResult = useCallback(
    (method: string, endpoint: string, contentType?: string) => {
      const key = getRequestKey(method, endpoint, contentType)
      return state.results[key] ?? null
    },
    [state.results]
  )

  const isLoading = useCallback(
    (method: string, endpoint: string, contentType?: string) => {
      const key = getRequestKey(method, endpoint, contentType)
      return state.loading[key] ?? false
    },
    [state.loading]
  )

  return {
    handleRequest,
    getResult,
    isLoading,
    results: state.results,
    loading: state.loading,
  }
}
