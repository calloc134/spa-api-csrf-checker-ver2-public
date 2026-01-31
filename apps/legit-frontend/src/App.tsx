import { useApiRequests, useCookie } from './hooks'
import { CookieSection, EndpointCard, LogViewer } from './components'
import { API_BASE, ENDPOINTS } from './constants'

function App() {
  const apiRequests = useApiRequests(API_BASE)
  const cookie = useCookie(API_BASE)

  return (
    <div className="max-w-5xl mx-auto p-5 font-sans">
      <h1 className="text-2xl font-bold text-gray-800 border-b-2 border-green-500 pb-2 mb-5">
        CSRF PoC - 正規サイト
      </h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
        <p className="my-1"><strong>API Base:</strong> {API_BASE || '(未設定)'}</p>
        <p className="my-1"><strong>現在のオリジン:</strong> {window.location.origin}</p>
        <p className="my-1">このページは正規のフロントエンドです。バックエンドAPIに対して正当なリクエストを送信します。</p>
      </div>

      <CookieSection cookie={cookie} isLegitSite={true} />

      <h2 className="text-xl font-semibold text-gray-600 mt-8 mb-4">各エンドポイントへのアクセス</h2>

      {ENDPOINTS.map((ep) => (
        <EndpointCard
          key={ep.path}
          endpoint={ep}
          apiRequests={apiRequests}
          isLegitSite={true}
        />
      ))}

      <h2 className="text-xl font-semibold text-gray-600 mt-8 mb-4">セキュリティログ閲覧</h2>
      
      <LogViewer />
    </div>
  )
}

export default App
