import { useQuery } from '@tanstack/react-query'
import { fetchLogs } from '../api'
import { QUERY_KEYS } from '../constants'

/**
 * セキュリティログ取得フック
 * @param backendUrl バックエンドURL
 * @param backendId バックエンドID（キャッシュキー用）
 * @param limit 取得件数
 * @param origin オプション: 発信元オリジンでフィルタリング
 */
export function useLogs(
  backendUrl: string,
  backendId: string,
  limit = 100,
  origin?: string
) {
  return useQuery({
    queryKey: [...QUERY_KEYS.logs(backendId), origin],
    queryFn: () => fetchLogs(backendUrl, limit, origin),
    refetchInterval: 10000, // 10秒ごとに自動更新
    staleTime: 5000, // 5秒間はキャッシュを使用
  })
}
