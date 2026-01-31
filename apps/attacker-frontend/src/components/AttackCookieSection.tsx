import type { BackendConfig } from '../types'
import { ResultDisplay } from './ResultDisplay'
import type { useMultiBackendCookie } from '../hooks'

type Props = {
  backend: BackendConfig
  cookie: ReturnType<typeof useMultiBackendCookie>
}

/**
 * 攻撃者サイト用Cookie取得セクションコンポーネント
 */
export function AttackCookieSection({ backend, cookie }: Props) {
  const { setCookie, getResult, isLoading } = cookie
  const result = getResult(backend.id)
  const loading = isLoading(backend.id)

  return (
    <div className="bg-white rounded-lg p-5 mb-5 shadow border-l-4 border-red-600">
      <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4 mt-0">
        Cookie 取得（攻撃前の準備）
      </h3>
      <p className="text-sm text-gray-500 mb-3">
        先に正規サイトでCookieを取得してから、このページで攻撃を試みてください。
        または、このボタンでCookieを取得することもできます（クロスオリジンでの取得）。
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className="px-5 py-2.5 rounded text-white text-sm transition-colors bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => setCookie(backend.url, backend.id)}
          disabled={loading}
        >
          {loading ? '読み込み中...' : 'Cookie を取得 (GET /set-cookie)'}
        </button>
      </div>
      {result && (
        <ResultDisplay result={result} isLoading={loading} />
      )}
    </div>
  )
}
