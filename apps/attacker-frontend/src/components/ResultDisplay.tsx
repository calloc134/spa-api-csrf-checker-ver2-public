import type { ApiResult } from '../types'

type Props = {
  result: ApiResult | null
  isLoading: boolean
}

/**
 * 結果のスタイルクラスを取得（攻撃者サイト用：成功=赤、失敗=緑）
 */
function getResultClasses(result: ApiResult | null): string {
  if (!result) return 'bg-gray-100 border-gray-300'
  const isSuccess = result.status >= 200 && result.status < 300 && !result.error
  // 攻撃者サイト: 成功=赤（攻撃成功）, 失敗=緑（攻撃ブロック）
  return isSuccess ? 'bg-red-100 border-red-300' : 'bg-green-100 border-green-300'
}

/**
 * APIリクエスト結果表示コンポーネント（攻撃者サイト用）
 */
export function ResultDisplay({ result, isLoading }: Props) {
  if (isLoading) {
    return <div className="text-gray-500 italic">読み込み中...</div>
  }

  if (!result) return null

  const isSuccess = result.status >= 200 && result.status < 300 && !result.error
  const badgeColor = isSuccess ? 'bg-red-600' : 'bg-green-600'
  const statusText = isSuccess ? '攻撃成功 (データ取得可)' : '攻撃失敗 (データ取得不可)'

  return (
    <div className={`border rounded p-4 mt-2 ${getResultClasses(result)}`}>
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mr-2 text-white ${badgeColor}`}>
        {result.error ? 'ERROR' : `${result.status}`}
      </span>
      <span>{statusText}</span>
      <p className="text-xs text-gray-500 my-1">
        ※ text/plainの場合、データ取得不可でもリクエスト自体は到達している可能性があります。
      </p>
      <pre className="mt-2 text-xs whitespace-pre-wrap break-all">{result.error || result.text}</pre>
    </div>
  )
}
