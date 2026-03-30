'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { HandoverRequest } from '@/lib/api'
import Header from '@/components/layout/header'

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:  { label: '待機中', className: 'bg-yellow-100 text-yellow-700' },
  claimed:  { label: '対応中', className: 'bg-blue-100 text-blue-700' },
  resolved: { label: '解決済', className: 'bg-green-100 text-green-700' },
}

export default function AiHandoverPage() {
  const [requests, setRequests] = useState<HandoverRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.ai.handover.list()
      setRequests(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function claim(id: string) {
    await api.ai.handover.claim(id)
    load()
  }

  async function resolve(id: string) {
    await api.ai.handover.resolve(id)
    load()
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="有人対応キュー" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4">
          <p className="text-sm text-gray-500">AIが対応できないと判断したユーザーのリストです。担当者が引き継いで対応します。</p>
        </div>

        {loading ? (
          <div className="text-gray-500 text-sm">読み込み中...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            <p>有人対応の待機がありません。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map(req => {
              const st = statusConfig[req.status] ?? { label: req.status, className: 'bg-gray-100 text-gray-700' }
              return (
                <div key={req.id} className="p-3 border border-gray-200 rounded-lg bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${st.className}`}>{st.label}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{req.friend_name ?? req.friend_id}</p>
                        {req.reason && <p className="text-xs text-gray-500 mt-0.5">{req.reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{formatDate(req.created_at)}</span>
                      <div className="flex gap-2">
                        {req.status === 'pending' && (
                          <button onClick={() => claim(req.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                            引き取る
                          </button>
                        )}
                        {req.status !== 'resolved' && (
                          <button onClick={() => resolve(req.id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                            解決済
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4">
          <button onClick={load} className="text-sm text-gray-500 hover:text-gray-700">
            更新
          </button>
        </div>
      </div>
    </div>
  )
}
