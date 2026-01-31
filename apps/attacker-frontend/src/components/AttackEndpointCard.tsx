import type { EndpointConfig, BackendConfig } from '../types'
import { ResultDisplay } from './ResultDisplay'
import type { useMultiBackendRequests } from '../hooks'

type Props = {
  endpoint: EndpointConfig
  backend: BackendConfig
  requests: ReturnType<typeof useMultiBackendRequests>
}

/**
 * 攻撃用エンドポイントカードコンポーネント
 */
export function AttackEndpointCard({ endpoint, backend, requests }: Props) {
  const { handleRequest, getResult, isLoading } = requests

  const buttonBaseClass = 'px-5 py-2.5 rounded text-white text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

  return (
    <div className="bg-white rounded-lg p-5 mb-5 shadow border-l-4 border-red-600">
      <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4 mt-0">
        {endpoint.name}
      </h3>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className={`${buttonBaseClass} bg-blue-500 hover:bg-blue-600`}
          onClick={() => handleRequest(backend.url, backend.id, endpoint.path, 'GET')}
          disabled={isLoading(backend.id, 'GET', endpoint.path)}
        >
          GET リクエスト（データ読み取り攻撃）
        </button>
        <button
          className={`${buttonBaseClass} bg-red-600 hover:bg-red-700`}
          onClick={() => handleRequest(backend.url, backend.id, endpoint.path, 'POST', 'application/json')}
          disabled={isLoading(backend.id, 'POST', endpoint.path, 'application/json')}
        >
          POST (application/json) - CSRF攻撃
        </button>
        <button
          className={`${buttonBaseClass} bg-orange-500 hover:bg-orange-600`}
          onClick={() => handleRequest(backend.url, backend.id, endpoint.path, 'POST', 'text/plain')}
          disabled={isLoading(backend.id, 'POST', endpoint.path, 'text/plain')}
        >
          POST (text/plain) - Simple Request CSRF
        </button>
      </div>

      <ResultDisplay
        result={getResult(backend.id, 'GET', endpoint.path)}
        isLoading={isLoading(backend.id, 'GET', endpoint.path)}
      />
      <ResultDisplay
        result={getResult(backend.id, 'POST', endpoint.path, 'application/json')}
        isLoading={isLoading(backend.id, 'POST', endpoint.path, 'application/json')}
      />
      <ResultDisplay
        result={getResult(backend.id, 'POST', endpoint.path, 'text/plain')}
        isLoading={isLoading(backend.id, 'POST', endpoint.path, 'text/plain')}
      />
    </div>
  )
}
