import { useLogs } from '../hooks'
import { API_BASE } from '../constants'
import type { SecurityLog } from '../types'

/**
 * セキュリティログ表示コンポーネント
 * 正規サイト用: 通信先のバックエンドから自サイト発信のログのみ表示
 */
export function LogViewer() {
  // 自サイトのオリジンでフィルタリング
  const currentOrigin = window.location.origin
  const { data, isLoading, error, refetch } = useLogs(
    API_BASE,
    'current',
    100,
    currentOrigin
  )

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600'
      case 'WARNING':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getAlertTypeColor = (alertType: string) => {
    switch (alertType) {
      case 'CSRF_ATTACK':
        return 'text-red-700 bg-red-100'
      case 'COOKIE_VALIDATION_FAILURE':
        return 'text-orange-700 bg-orange-100'
      case 'CONTENT_TYPE_VALIDATION_FAILURE':
        return 'text-yellow-700 bg-yellow-100'
      case 'ORIGIN_VALIDATION_FAILURE':
        return 'text-purple-700 bg-purple-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString('ja-JP')
  }

  return (
    <div className="bg-white rounded-lg p-5 mb-5 shadow">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mt-0 mb-0">
          セキュリティログ
        </h3>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-60"
        >
          {isLoading ? '読込中...' : '更新'}
        </button>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        発信元: {currentOrigin}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 rounded p-3 mb-4 text-red-700">
          エラー: {String(error)}
        </div>
      )}

      {data?.error && (
        <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-4 text-yellow-700">
          {data.error}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500 italic">読み込み中...</div>
      ) : data?.logs && data.logs.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {data.logs.map((log: SecurityLog) => (
            <div
              key={log.id}
              className="border border-gray-200 rounded p-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getSeverityColor(log.severity)}`}>
                  {log.severity}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getAlertTypeColor(log.alertType)}`}>
                  {log.alertType}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="font-medium text-gray-600">Endpoint:</span>{' '}
                  <span className="font-mono">{log.method} {log.endpoint}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Origin:</span>{' '}
                  <span className="font-mono">{log.receivedOrigin || '(なし)'}</span>
                </div>
                {log.contentType && (
                  <div>
                    <span className="font-medium text-gray-600">Content-Type:</span>{' '}
                    <span className="font-mono">{log.contentType}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-600">Cookie:</span>{' '}
                  <span>{log.cookiePresent ? 'あり' : 'なし'}</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">{log.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">
          ログがありません
        </div>
      )}

      {data?.count !== undefined && data.count > 0 && (
        <div className="text-xs text-gray-500 mt-3 text-right">
          {data.count} 件のログ
        </div>
      )}
    </div>
  )
}
