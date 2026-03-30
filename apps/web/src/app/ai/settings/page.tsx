'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { AiProvider, AiPersona } from '@/lib/api'
import Header from '@/components/layout/header'

const PROVIDERS = ['gemini', 'openai', 'anthropic', 'ollama'] as const

export default function AiSettingsPage() {
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [personas, setPersonas] = useState<AiPersona[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'providers' | 'personas'>('providers')

  // Provider form
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [providerForm, setProviderForm] = useState({ name: '', provider: 'gemini', model: '', api_key: '', base_url: '' })
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null)

  // Persona form
  const [showPersonaForm, setShowPersonaForm] = useState(false)
  const [personaForm, setPersonaForm] = useState({ name: '', provider_id: '', system_prompt: '', temperature: 0.7, max_tokens: 1000 })
  const [editingPersona, setEditingPersona] = useState<AiPersona | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, pe] = await Promise.all([api.ai.providers.list(), api.ai.personas.list()])
      setProviders(p.data)
      setPersonas(pe.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveProvider() {
    if (!providerForm.name || !providerForm.model) return
    if (editingProvider) {
      await api.ai.providers.update(editingProvider.id, {
        name: providerForm.name,
        model: providerForm.model,
        api_key: providerForm.api_key || undefined,
        base_url: providerForm.base_url || undefined,
      })
    } else {
      await api.ai.providers.create({
        name: providerForm.name,
        provider: providerForm.provider,
        model: providerForm.model,
        api_key: providerForm.api_key || undefined,
        base_url: providerForm.base_url || undefined,
      })
    }
    setShowProviderForm(false)
    setEditingProvider(null)
    setProviderForm({ name: '', provider: 'gemini', model: '', api_key: '', base_url: '' })
    load()
  }

  async function toggleProvider(p: AiProvider) {
    await api.ai.providers.update(p.id, { is_active: p.is_active ? 0 : 1 })
    load()
  }

  async function deleteProvider(id: string) {
    if (!confirm('削除しますか？')) return
    await api.ai.providers.delete(id)
    load()
  }

  function editProvider(p: AiProvider) {
    setEditingProvider(p)
    setProviderForm({ name: p.name, provider: p.provider, model: p.model, api_key: '', base_url: p.base_url || '' })
    setShowProviderForm(true)
  }

  async function savePersona() {
    if (!personaForm.name || !personaForm.provider_id || !personaForm.system_prompt) return
    if (editingPersona) {
      await api.ai.personas.update(editingPersona.id, {
        name: personaForm.name,
        system_prompt: personaForm.system_prompt,
        temperature: personaForm.temperature,
        max_tokens: personaForm.max_tokens,
      })
    } else {
      await api.ai.personas.create(personaForm)
    }
    setShowPersonaForm(false)
    setEditingPersona(null)
    setPersonaForm({ name: '', provider_id: '', system_prompt: '', temperature: 0.7, max_tokens: 1000 })
    load()
  }

  async function togglePersona(pe: AiPersona) {
    await api.ai.personas.update(pe.id, { is_active: pe.is_active ? 0 : 1 })
    load()
  }

  function editPersona(pe: AiPersona) {
    setEditingPersona(pe)
    setPersonaForm({
      name: pe.name,
      provider_id: pe.provider_id,
      system_prompt: pe.system_prompt,
      temperature: pe.temperature,
      max_tokens: pe.max_tokens,
    })
    setShowPersonaForm(true)
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="AI設定" />
      <div className="flex-1 overflow-auto p-6">
        {/* タブ */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {(['providers', 'personas'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'providers' ? 'AIプロバイダー' : 'AIペルソナ'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-500 text-sm">読み込み中...</div>
        ) : tab === 'providers' ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">AIプロバイダー</h2>
              <button
                onClick={() => { setEditingProvider(null); setProviderForm({ name: '', provider: 'gemini', model: '', api_key: '', base_url: '' }); setShowProviderForm(true) }}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                + 追加
              </button>
            </div>

            {showProviderForm && (
              <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <h3 className="text-sm font-medium text-gray-700">{editingProvider ? 'プロバイダー編集' : '新規プロバイダー'}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">名前</label>
                    <input className="w-full border rounded px-3 py-1.5 text-sm" value={providerForm.name} onChange={e => setProviderForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  {!editingProvider && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">プロバイダー</label>
                      <select className="w-full border rounded px-3 py-1.5 text-sm" value={providerForm.provider} onChange={e => setProviderForm(f => ({ ...f, provider: e.target.value }))}>
                        {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">モデル名</label>
                    <input className="w-full border rounded px-3 py-1.5 text-sm" placeholder="gemini-2.5-flash" value={providerForm.model} onChange={e => setProviderForm(f => ({ ...f, model: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">APIキー {editingProvider && <span className="text-gray-400">（変更する場合のみ）</span>}</label>
                    <input type="password" className="w-full border rounded px-3 py-1.5 text-sm" value={providerForm.api_key} onChange={e => setProviderForm(f => ({ ...f, api_key: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">ベースURL（任意・Ollamaなど）</label>
                    <input className="w-full border rounded px-3 py-1.5 text-sm" placeholder="http://localhost:11434/v1" value={providerForm.base_url} onChange={e => setProviderForm(f => ({ ...f, base_url: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProvider} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">保存</button>
                  <button onClick={() => { setShowProviderForm(false); setEditingProvider(null) }} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100">キャンセル</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {providers.length === 0 && <p className="text-sm text-gray-500">プロバイダーがありません。追加してください。</p>}
              {providers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? '有効' : '無効'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.provider} / {p.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => editProvider(p)} className="text-xs text-blue-600 hover:underline">編集</button>
                    <button onClick={() => toggleProvider(p)} className="text-xs text-gray-500 hover:underline">{p.is_active ? '無効化' : '有効化'}</button>
                    <button onClick={() => deleteProvider(p.id)} className="text-xs text-red-500 hover:underline">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">AIペルソナ</h2>
              <button
                onClick={() => { setEditingPersona(null); setPersonaForm({ name: '', provider_id: '', system_prompt: '', temperature: 0.7, max_tokens: 1000 }); setShowPersonaForm(true) }}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                disabled={providers.length === 0}
              >
                + 追加
              </button>
            </div>
            {providers.length === 0 && <p className="text-sm text-amber-600 mb-4">先にプロバイダーを追加してください。</p>}

            {showPersonaForm && (
              <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <h3 className="text-sm font-medium text-gray-700">{editingPersona ? 'ペルソナ編集' : '新規ペルソナ'}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ペルソナ名</label>
                    <input className="w-full border rounded px-3 py-1.5 text-sm" value={personaForm.name} onChange={e => setPersonaForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">プロバイダー</label>
                    <select className="w-full border rounded px-3 py-1.5 text-sm" value={personaForm.provider_id} onChange={e => setPersonaForm(f => ({ ...f, provider_id: e.target.value }))}>
                      <option value="">選択してください</option>
                      {providers.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">システムプロンプト</label>
                    <textarea rows={4} className="w-full border rounded px-3 py-1.5 text-sm" value={personaForm.system_prompt} onChange={e => setPersonaForm(f => ({ ...f, system_prompt: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Temperature（0〜1）</label>
                    <input type="number" min={0} max={1} step={0.1} className="w-full border rounded px-3 py-1.5 text-sm" value={personaForm.temperature} onChange={e => setPersonaForm(f => ({ ...f, temperature: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">最大トークン数</label>
                    <input type="number" min={100} max={4000} className="w-full border rounded px-3 py-1.5 text-sm" value={personaForm.max_tokens} onChange={e => setPersonaForm(f => ({ ...f, max_tokens: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={savePersona} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">保存</button>
                  <button onClick={() => { setShowPersonaForm(false); setEditingPersona(null) }} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100">キャンセル</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {personas.length === 0 && <p className="text-sm text-gray-500">ペルソナがありません。追加してください。</p>}
              {personas.map(pe => {
                const providerName = providers.find(p => p.id === pe.provider_id)?.name ?? pe.provider_id
                return (
                  <div key={pe.id} className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pe.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {pe.is_active ? '有効' : '無効'}
                        </span>
                        <p className="text-sm font-medium text-gray-900">{pe.name}</p>
                        <p className="text-xs text-gray-500">{providerName} / temp:{pe.temperature} / max:{pe.max_tokens}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => editPersona(pe)} className="text-xs text-blue-600 hover:underline">編集</button>
                        <button onClick={() => togglePersona(pe)} className="text-xs text-gray-500 hover:underline">{pe.is_active ? '無効化' : '有効化'}</button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded">{pe.system_prompt}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
