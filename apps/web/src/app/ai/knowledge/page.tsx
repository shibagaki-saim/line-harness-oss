'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { KnowledgeDoc } from '@/lib/api'
import Header from '@/components/layout/header'

export default function AiKnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', source_type: 'text' })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.ai.knowledge.list()
      setDocs(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      await api.ai.knowledge.create(form)
      setForm({ title: '', content: '', source_type: 'text' })
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="ナレッジベース" />
      <div className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-500">AIがRAG検索に使うドキュメントを管理します。</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            + ドキュメント追加
          </button>
        </div>

        {showForm && (
          <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">新規ドキュメント</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">タイトル</label>
              <input
                className="w-full border rounded px-3 py-1.5 text-sm"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="よくある質問 / 商品説明など"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">種別</label>
              <select className="border rounded px-3 py-1.5 text-sm" value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}>
                <option value="text">テキスト</option>
                <option value="url">URL</option>
                <option value="file">ファイル</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">内容</label>
              <textarea
                rows={8}
                className="w-full border rounded px-3 py-1.5 text-sm font-mono"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="ここに学習させたいテキストを貼り付けてください..."
              />
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? '処理中...' : '登録・チャンク化'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100">キャンセル</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-gray-500 text-sm">読み込み中...</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">ドキュメントがありません。</p>
            <p className="text-xs mt-1">FAQや商品説明などを登録すると、AIが参照して回答します。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700`}>
                      {doc.source_type}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                      <p className="text-xs text-gray-500">{doc.chunk_count}チャンク / {doc.is_indexed ? 'インデックス済' : '未インデックス'}</p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === doc.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedId === doc.id && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded max-h-60 overflow-auto">{doc.content}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
