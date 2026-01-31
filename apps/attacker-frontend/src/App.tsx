import { useState } from 'react'
import { useMultiBackendRequests, useMultiBackendCookie } from './hooks'
import {
  BackendTabs,
  AttackCookieSection,
  AttackEndpointCard,
  LogViewer,
} from './components'
import { BACKENDS, ENDPOINTS, API_A, API_B, API_C } from './constants'

function App() {
  const [activeTab, setActiveTab] = useState('A')
  const requests = useMultiBackendRequests()
  const cookie = useMultiBackendCookie()

  const activeBackend = BACKENDS.find((b) => b.id === activeTab)!

  return (
    <div className="max-w-5xl mx-auto p-5 font-sans bg-red-50 min-h-screen">
      <h1 className="text-2xl font-bold text-red-700 border-b-2 border-red-600 pb-2 mb-5">
        CSRF PoC - 攻撃者サイト
      </h1>

      <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 mb-5">
        <p className="my-1"><strong>警告:</strong> これは攻撃者のページです（教育目的）</p>
        <p className="my-1">このページから正規のバックエンドAPIに対してクロスオリジンリクエストを送信し、CSRF攻撃やデータ読み取りが可能かどうかを検証します。</p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-5">
        <p className="my-1"><strong>現在のオリジン:</strong> {window.location.origin}</p>
        <p className="my-1"><strong>Backend A:</strong> {API_A || '(未設定)'}</p>
        <p className="my-1"><strong>Backend B:</strong> {API_B || '(未設定)'}</p>
        <p className="my-1"><strong>Backend C:</strong> {API_C || '(未設定)'}</p>
      </div>

      <BackendTabs
        backends={BACKENDS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="bg-gray-100 border border-gray-300 rounded p-3 mb-5">
        <p className="my-1"><strong>攻撃対象:</strong> {activeBackend.name}</p>
        <p className="my-1"><strong>URL:</strong> {activeBackend.url || '(未設定)'}</p>
      </div>

      <AttackCookieSection backend={activeBackend} cookie={cookie} />

      <h2 className="text-xl font-semibold text-gray-600 mt-8 mb-4">攻撃試行 - 各エンドポイント</h2>

      {ENDPOINTS.map((ep) => (
        <AttackEndpointCard
          key={ep.path}
          endpoint={ep}
          backend={activeBackend}
          requests={requests}
        />
      ))}

      <h2 className="text-xl font-semibold text-gray-600 mt-8 mb-4">セキュリティログ閲覧</h2>

      <LogViewer backendId={activeTab as 'A' | 'B' | 'C'} />
    </div>
  )
}

export default App
