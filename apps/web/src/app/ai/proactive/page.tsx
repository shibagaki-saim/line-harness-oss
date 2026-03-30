'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { AiProactiveConfig, AiPersona } from '@/lib/api'
import Header from '@/components/layout/header'

const TRIGGER_TYPES = [
  { value: 'score_threshold', label: 'スコアが閾値に達したとき' },
  { value: 'tag_added', label: 'タグが追加されたとき' },
  { value: 'inactivity_days', label: '未開封が○日続いたとき' },
]

export default function AiProactivePage() {
  const [configs, setConfigs] = useState<AiProactiveConfig[]>([])
  const [personas, setPersonas] = useState<AiPersona[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    persona_id: '',
    trigger_type: 'score_threshold',
    trigger_value: '',
    message_template: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, pe] = await Promise.all([api.ai.proactive.list(), api.ai.personas.list()])
      setConfigs(c.data)
      setPersonas(pe.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.persona_id || !form.trigger_value || !form.message_template) return
    await api.ai.proactive.create(form)
    setForm({ persona_id: '', trigger_type: 'score_threshold', trigger_value: '', message_template: '' })
    setShowForm(false)
    load()
  }

  const triggerLabel = (type: string) => TRIGGER_TYPES.find(t => t.value === type)?.label ?? type

  return (
    <div className="flex flex-col h-full">
      <Header title="プロアクティブ配信" />
      <div className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">条件を満たしたユーザーにAIが自動でメッセージを送ります。</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
            disabled={personas.length === 0}
          >
            + 設定追加
          </button>
        </div>

        {personas.length === 0 && !loading && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            先に「AI設定」でペルソナを作成してください。
          </div>
        )}

        {showForm && (
          <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">新規プロアクティブ設定</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">ペルソナ</label>
                <select className="w-full border rounded px-3 py-1.5 text-sm" value={form.persona_id} onChange={e => setForm(f => ({ ...f, persona_id: e.target.value }))}>
                  <option value="">選択してください</option>
                  {personas.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">トリガー種別</label>
                <select className="w-full border rounded px-3 py-1.5 text-sm" value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))}>
                  {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {form.trigger_type === 'score_threshold' ? '閾値（スコア数値）' :
                   form.trigger_type === 'tag_added' ? 'タグ名' : '日数'}
                </label>
                <input
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder={form.trigger_type === 'score_threshold' ? '100' : form.trigger_type === 'tag_added' ? '購入検討中' : '7'}
                  value={form.trigger_value}
                  onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">{'メッセージテンプレート（{{name}}, {{score}}使用可）'}</label>
                <textarea
                  rows={3}
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder="こんにちは、{{name}}さん！最近ご利用いただけていないようなので..."
                  value={form.message_template}
                  onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">保存</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100">キャンセル</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-gray-500 text-sm">読み込み中...</div>
        ) : configs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">プロアクティブ配信の設定がありません。</div>
        ) : (
          <div className="space-y-2">
            {configs.map(c => {
              const personaName = personas.find(p => p.id === c.persona_id)?.name ?? c.persona_id
              return (
                <div key={c.id} className="p-3 border border-gray-200 rounded-lg bg-white">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? '有効' : '無効'}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{personaName}</span>
                    <span className="text-xs text-gray-500">{triggerLabel(c.trigger_type)}: <strong>{c.trigger_value}</strong></span>
                  </div>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{c.message_template}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
