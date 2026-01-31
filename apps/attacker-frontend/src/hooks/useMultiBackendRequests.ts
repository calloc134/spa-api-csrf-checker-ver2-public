import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { callApi, getRequestKey } from '../api'
import { QUERY_KEYS } from '../constants'
import type { ApiResult } from '../types'

type BackendRequestState = {
  results: Record<string, Record<string, ApiResult | null>>
  loading: Record<string, Record<string, boolean>>
}

/**
 * 複数バックエンド対応のAPIリクエスト状態管理フック
 */
export function useMultiBackendRequests() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<BackendRequestState>({
    results: {},
    loading: {},
  })

  const handleRequest = useCallback(
    async (backendUrl: string, backendId: string, endpoint: string, method: 'GET' | 'POST', contentType?: string) => {
      const key = getRequestKey(method, endpoint, contentType)
      setState((prev) => ({
        ...prev,
        loading: {
          ...prev.loading,
          [backendId]: { ...prev.loading[backendId], [key]: true },
        },
      }))

      const result = await callApi(backendUrl, endpoint, method, contentType)

      setState((prev) => ({
        results: {
          ...prev.results,
          [backendId]: { ...prev.results[backendId], [key]: result },
        },
        loading: {
          ...prev.loading,
          [backendId]: { ...prev.loading[backendId], [key]: false },
        },
      }))

      // リクエスト完了後、該当バックエンドのログキャッシュを即座にinvalidate
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.logs(backendId) })

      return result
    },
    [queryClient]
  )

  const getResult = useCallback(
    (backendId: string, method: string, endpoint: string, contentType?: string) => {
      const key = getRequestKey(method, endpoint, contentType)
      return state.results[backendId]?.[key] ?? null
    },
    [state.results]
  )

  const isLoading = useCallback(
    (backendId: string, method: string, endpoint: string, contentType?: string) => {
      const key = getRequestKey(method, endpoint, contentType)
      return state.loading[backendId]?.[key] ?? false
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
