import type { BackendConfig } from '../types'

type Props = {
  backends: BackendConfig[]
  activeTab: string
  onTabChange: (id: string) => void
}

/**
 * バックエンドタブコンポーネント
 */
export function BackendTabs({ backends, activeTab, onTabChange }: Props) {
  return (
    <div className="flex border-b-2 border-gray-300 mb-5">
      {backends.map((backend) => (
        <button
          key={backend.id}
          className={`px-5 py-2.5 bg-transparent border-none cursor-pointer text-base border-b-2 -mb-0.5 transition-colors ${
            activeTab === backend.id
              ? 'border-red-600 text-red-600 font-bold'
              : 'border-transparent hover:bg-gray-100'
          }`}
          onClick={() => onTabChange(backend.id)}
        >
          {backend.id}: {backend.id === 'A' ? 'SameSite=Lax' : backend.id === 'B' ? 'SameSite=Lax' : 'SameSite=None'}
        </button>
      ))}
    </div>
  )
}
