'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { AiConversation } from '@/lib/api'
import Header from '@/components/layout/header'

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:   { label: '処理中', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '完了',   className: 'bg-green-100 text-green-700' },
  failed:    { label: '失敗',   className: 'bg-red-100 text-red-700' },
}

export default function AiLogsPage() {
  const [logs, setLogs] = useState<AiConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 50

  const load = useCallback(async (o: number) => {
    setLoading(true)
    try {
      const res = await api.ai.conversations.list({ limit, offset: o })
      setLogs(res.data.items)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(offset) }, [load, offset])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="AI会話ログ" />
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-gray-500 text-sm">読み込み中...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">会話ログがありません。</div>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {logs.map(log => {
                const st = statusConfig[log.status] ?? { label: log.status, className: 'bg-gray-100 text-gray-700' }
                return (
                  <div key={log.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${st.className}`}>{st.label}</span>
                        <p className="text-sm text-gray-900 truncate">{log.user_message}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-xs text-gray-400">{log.model}</span>
                        {log.latency_ms && <span className="text-xs text-gray-400">{log.latency_ms}ms</span>}
                        <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {expandedId === log.id && (
                      <div className="px-3 pb-3 border-t border-gray-100 space-y-2">
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">ユーザー</p>
                          <p className="text-sm text-gray-800 bg-blue-50 p-2 rounded">{log.user_message}</p>
                        </div>
                        {log.ai_response && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">AI</p>
                            <p className="text-sm text-gray-800 bg-green-50 p-2 rounded whitespace-pre-wrap">{log.ai_response}</p>
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-gray-400">
                          {log.input_tokens != null && <span>入力: {log.input_tokens}トークン</span>}
                          {log.output_tokens != null && <span>出力: {log.output_tokens}トークン</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              {offset > 0 && (
                <button onClick={() => setOffset(o => Math.max(0, o - limit))} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100">← 前へ</button>
              )}
              {logs.length === limit && (
                <button onClick={() => setOffset(o => o + limit)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100">次へ →</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
