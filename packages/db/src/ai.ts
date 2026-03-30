import { jstNow } from './utils';

// ─── 型定義 ─────────────────────────────────────────────────

export type AiProvider = {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  model: string;
  api_key_enc: string | null;
  base_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type AiPersona = {
  id: string;
  name: string;
  provider_id: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type AiConversation = {
  id: string;
  friend_id: string;
  persona_id: string | null;
  user_message: string;
  ai_response: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
};

export type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  source_type: 'text' | 'url' | 'file';
  chunk_count: number;
  is_indexed: number;
  created_at: string;
  updated_at: string;
};

export type KnowledgeChunk = {
  id: string;
  doc_id: string;
  chunk_index: number;
  content: string;
  vector_id: string | null;
  created_at: string;
};

export type HumanHandoverRequest = {
  id: string;
  friend_id: string;
  reason: string | null;
  status: 'pending' | 'claimed' | 'resolved';
  operator_id: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type AiProactiveConfig = {
  id: string;
  persona_id: string;
  trigger_type: 'score_threshold' | 'tag_added' | 'inactivity_days';
  trigger_value: string;
  message_template: string;
  is_active: number;
  created_at: string;
};

// ─── AIプロバイダー ──────────────────────────────────────────

export async function getAiProviders(db: D1Database): Promise<AiProvider[]> {
  const result = await db.prepare('SELECT * FROM ai_providers ORDER BY created_at DESC').all<AiProvider>();
  return result.results;
}

export async function getActiveAiProvider(db: D1Database): Promise<AiProvider | null> {
  return db.prepare('SELECT * FROM ai_providers WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1').first<AiProvider>();
}

export async function getAiProviderById(db: D1Database, id: string): Promise<AiProvider | null> {
  return db.prepare('SELECT * FROM ai_providers WHERE id = ?').bind(id).first<AiProvider>();
}

export async function createAiProvider(db: D1Database, data: Omit<AiProvider, 'created_at' | 'updated_at'>): Promise<AiProvider> {
  const now = jstNow();
  await db.prepare(
    'INSERT INTO ai_providers (id, name, provider, model, api_key_enc, base_url, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(data.id, data.name, data.provider, data.model, data.api_key_enc, data.base_url, data.is_active, now, now).run();
  return { ...data, created_at: now, updated_at: now };
}

export async function updateAiProvider(db: D1Database, id: string, data: Partial<Pick<AiProvider, 'name' | 'model' | 'api_key_enc' | 'base_url' | 'is_active'>>): Promise<void> {
  const fields = Object.entries(data).map(([k]) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), jstNow(), id];
  await db.prepare(`UPDATE ai_providers SET ${fields}, updated_at = ? WHERE id = ?`).bind(...values).run();
}

export async function deleteAiProvider(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM ai_providers WHERE id = ?').bind(id).run();
}

// ─── AIペルソナ ──────────────────────────────────────────────

export async function getAiPersonas(db: D1Database): Promise<AiPersona[]> {
  const result = await db.prepare('SELECT * FROM ai_personas ORDER BY created_at DESC').all<AiPersona>();
  return result.results;
}

export async function getActiveAiPersona(db: D1Database): Promise<AiPersona | null> {
  return db.prepare('SELECT * FROM ai_personas WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1').first<AiPersona>();
}

export async function getAiPersonaById(db: D1Database, id: string): Promise<AiPersona | null> {
  return db.prepare('SELECT * FROM ai_personas WHERE id = ?').bind(id).first<AiPersona>();
}

export async function createAiPersona(db: D1Database, data: Omit<AiPersona, 'created_at' | 'updated_at'>): Promise<AiPersona> {
  const now = jstNow();
  await db.prepare(
    'INSERT INTO ai_personas (id, name, provider_id, system_prompt, temperature, max_tokens, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(data.id, data.name, data.provider_id, data.system_prompt, data.temperature, data.max_tokens, data.is_active, now, now).run();
  return { ...data, created_at: now, updated_at: now };
}

export async function updateAiPersona(db: D1Database, id: string, data: Partial<Pick<AiPersona, 'name' | 'system_prompt' | 'temperature' | 'max_tokens' | 'is_active'>>): Promise<void> {
  const fields = Object.entries(data).map(([k]) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), jstNow(), id];
  await db.prepare(`UPDATE ai_personas SET ${fields}, updated_at = ? WHERE id = ?`).bind(...values).run();
}

// ─── AI会話ログ ──────────────────────────────────────────────

export async function createAiConversation(db: D1Database, data: Omit<AiConversation, 'created_at'>): Promise<AiConversation> {
  const now = jstNow();
  await db.prepare(
    'INSERT INTO ai_conversations (id, friend_id, persona_id, user_message, ai_response, model, input_tokens, output_tokens, latency_ms, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(data.id, data.friend_id, data.persona_id, data.user_message, data.ai_response, data.model, data.input_tokens, data.output_tokens, data.latency_ms, data.status, now).run();
  return { ...data, created_at: now };
}

export async function updateAiConversation(db: D1Database, id: string, data: Partial<Pick<AiConversation, 'ai_response' | 'model' | 'input_tokens' | 'output_tokens' | 'latency_ms' | 'status'>>): Promise<void> {
  const fields = Object.entries(data).map(([k]) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];
  await db.prepare(`UPDATE ai_conversations SET ${fields} WHERE id = ?`).bind(...values).run();
}

export async function getAiConversationsByFriend(db: D1Database, friendId: string, limit = 20): Promise<AiConversation[]> {
  const result = await db.prepare('SELECT * FROM ai_conversations WHERE friend_id = ? ORDER BY created_at DESC LIMIT ?').bind(friendId, limit).all<AiConversation>();
  return result.results;
}

export async function getAiConversations(db: D1Database, limit = 50, offset = 0): Promise<{ items: AiConversation[]; total: number }> {
  const [items, countRow] = await Promise.all([
    db.prepare('SELECT * FROM ai_conversations ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all<AiConversation>(),
    db.prepare('SELECT COUNT(*) as count FROM ai_conversations').first<{ count: number }>(),
  ]);
  return { items: items.results, total: countRow?.count ?? 0 };
}

// ─── ナレッジ ────────────────────────────────────────────────

export async function getKnowledgeDocs(db: D1Database): Promise<KnowledgeDoc[]> {
  const result = await db.prepare('SELECT * FROM knowledge_docs ORDER BY created_at DESC').all<KnowledgeDoc>();
  return result.results;
}

export async function createKnowledgeDoc(db: D1Database, data: Omit<KnowledgeDoc, 'created_at' | 'updated_at'>): Promise<KnowledgeDoc> {
  const now = jstNow();
  await db.prepare(
    'INSERT INTO knowledge_docs (id, title, content, source_type, chunk_count, is_indexed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(data.id, data.title, data.content, data.source_type, data.chunk_count, data.is_indexed, now, now).run();
  return { ...data, created_at: now, updated_at: now };
}

export async function updateKnowledgeDocIndexed(db: D1Database, id: string, chunkCount: number): Promise<void> {
  await db.prepare('UPDATE knowledge_docs SET is_indexed = 1, chunk_count = ?, updated_at = ? WHERE id = ?').bind(chunkCount, jstNow(), id).run();
}

export async function createKnowledgeChunk(db: D1Database, data: Omit<KnowledgeChunk, 'created_at'>): Promise<void> {
  const now = jstNow();
  await db.prepare(
    'INSERT INTO knowledge_chunks (id, doc_id, chunk_index, content, vector_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(data.id, data.doc_id, data.chunk_index, data.content, data.vector_id, now).run();
}

export async function getKnowledgeChunksByDoc(db: D1Database, docId: string): Promise<KnowledgeChunk[]> {
  const result = await db.prepare('SELECT * FROM knowledge_chunks WHERE doc_id = ? ORDER BY chunk_index ASC').bind(docId).all<KnowledgeChunk>();
  return result.results;
}

// ─── 有人切替 ────────────────────────────────────────────────

export async function createHandoverRequest(db: D1Database, data: Omit<HumanHandoverRequest, 'created_at' | 'resolved_at'>): Promise<HumanHandoverRequest> {
  const now = jstNow();
  await db.prepare(
    'INSERT INTO human_handover_requests (id, friend_id, reason, status, operator_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(data.id, data.friend_id, data.reason, data.status, data.operator_id, now).run();
  return { ...data, created_at: now, resolved_at: null };
}

export async function getPendingHandoverRequests(db: D1Database): Promise<HumanHandoverRequest[]> {
  const result = await db.prepare("SELECT * FROM human_handover_requests WHERE status = 'pending' ORDER BY created_at ASC").all<HumanHandoverRequest>();
  return result.results;
}

export async function updateHandoverRequest(db: D1Database, id: string, status: 'claimed' | 'resolved', operatorId?: string): Promise<void> {
  const resolvedAt = status === 'resolved' ? jstNow() : null;
  await db.prepare('UPDATE human_handover_requests SET status = ?, operator_id = COALESCE(?, operator_id), resolved_at = ? WHERE id = ?')
    .bind(status, operatorId ?? null, resolvedAt, id).run();
}

export async function getHandoverRequestByFriend(db: D1Database, friendId: string): Promise<HumanHandoverRequest | null> {
  return db.prepare("SELECT * FROM human_handover_requests WHERE friend_id = ? AND status != 'resolved' ORDER BY created_at DESC LIMIT 1").bind(friendId).first<HumanHandoverRequest>();
}

// ─── プロアクティブ設定 ──────────────────────────────────────

export async function getAiProactiveConfigs(db: D1Database): Promise<AiProactiveConfig[]> {
  const result = await db.prepare('SELECT * FROM ai_proactive_configs WHERE is_active = 1 ORDER BY created_at DESC').all<AiProactiveConfig>();
  return result.results;
}

export async function createAiProactiveConfig(db: D1Database, data: Omit<AiProactiveConfig, 'created_at'>): Promise<AiProactiveConfig> {
  const now = jstNow();
  await db.prepare(
    'INSERT INTO ai_proactive_configs (id, persona_id, trigger_type, trigger_value, message_template, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(data.id, data.persona_id, data.trigger_type, data.trigger_value, data.message_template, data.is_active, now).run();
  return { ...data, created_at: now };
}
