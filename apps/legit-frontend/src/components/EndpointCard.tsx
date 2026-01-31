import type { EndpointConfig } from '../types'
import { ResultDisplay } from './ResultDisplay'
import type { useApiRequests } from '../hooks'

type Props = {
  endpoint: EndpointConfig
  apiRequests: ReturnType<typeof useApiRequests>
  isLegitSite?: boolean
  /** ボタンのラベルカスタマイズ用 */
  buttonLabels?: {
    get?: string
    postJson?: string
    postText?: string
  }
}

const defaultLabels = {
  get: 'GET リクエスト',
  postJson: 'POST (application/json)',
  postText: 'POST (text/plain - Simple Request)',
}

/**
 * エンドポイントテストカードコンポーネント
 */
export function EndpointCard({ endpoint, apiRequests, isLegitSite = true, buttonLabels }: Props) {
  const { handleRequest, getResult, isLoading } = apiRequests
  const labels = { ...defaultLabels, ...buttonLabels }

  const buttonBaseClass = 'px-5 py-2.5 rounded text-white text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

  return (
    <div className={`bg-white rounded-lg p-5 mb-5 shadow ${!isLegitSite ? 'border-l-4 border-red-600' : ''}`}>
      <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4 mt-0">
        {endpoint.name}
      </h3>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className={`${buttonBaseClass} bg-blue-500 hover:bg-blue-600`}
          onClick={() => handleRequest(endpoint.path, 'GET')}
          disabled={isLoading('GET', endpoint.path)}
        >
          {labels.get}
        </button>
        <button
          className={`${buttonBaseClass} ${isLegitSite ? 'bg-green-500 hover:bg-green-600' : 'bg-red-600 hover:bg-red-700'}`}
          onClick={() => handleRequest(endpoint.path, 'POST', 'application/json')}
          disabled={isLoading('POST', endpoint.path, 'application/json')}
        >
          {labels.postJson}
        </button>
        <button
          className={`${buttonBaseClass} bg-orange-500 hover:bg-orange-600`}
          onClick={() => handleRequest(endpoint.path, 'POST', 'text/plain')}
          disabled={isLoading('POST', endpoint.path, 'text/plain')}
        >
          {labels.postText}
        </button>
      </div>

      <ResultDisplay
        result={getResult('GET', endpoint.path)}
        isLoading={isLoading('GET', endpoint.path)}
        isLegitSite={isLegitSite}
      />
      <ResultDisplay
        result={getResult('POST', endpoint.path, 'application/json')}
        isLoading={isLoading('POST', endpoint.path, 'application/json')}
        isLegitSite={isLegitSite}
      />
      <ResultDisplay
        result={getResult('POST', endpoint.path, 'text/plain')}
        isLoading={isLoading('POST', endpoint.path, 'text/plain')}
        isLegitSite={isLegitSite}
      />
    </div>
  )
}
