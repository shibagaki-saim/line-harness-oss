-- Phase 1: AIナーチャリング テーブル追加

-- ============================================================
-- AIプロバイダー設定
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_providers (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  provider     TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini', 'ollama')),
  model        TEXT NOT NULL,
  api_key_enc  TEXT,
  base_url     TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours'))
);

-- ============================================================
-- AIペルソナ
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_personas (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  provider_id      TEXT NOT NULL REFERENCES ai_providers (id) ON DELETE CASCADE,
  system_prompt    TEXT NOT NULL,
  temperature      REAL NOT NULL DEFAULT 0.7,
  max_tokens       INTEGER NOT NULL DEFAULT 500,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours'))
);

CREATE INDEX IF NOT EXISTS idx_ai_personas_provider_id ON ai_personas (provider_id);

-- ============================================================
-- AI会話ログ
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id             TEXT PRIMARY KEY,
  friend_id      TEXT NOT NULL REFERENCES friends (id) ON DELETE CASCADE,
  persona_id     TEXT REFERENCES ai_personas (id) ON DELETE SET NULL,
  user_message   TEXT NOT NULL,
  ai_response    TEXT,
  model          TEXT,
  input_tokens   INTEGER,
  output_tokens  INTEGER,
  latency_ms     INTEGER,
  status         TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_friend_id ON ai_conversations (friend_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_status ON ai_conversations (status);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations (created_at);

-- ============================================================
-- ナレッジドキュメント
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  source_type  TEXT NOT NULL CHECK (source_type IN ('text', 'url', 'file')) DEFAULT 'text',
  chunk_count  INTEGER NOT NULL DEFAULT 0,
  is_indexed   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours'))
);

-- ============================================================
-- ナレッジチャンク（Vectorize連携）
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          TEXT PRIMARY KEY,
  doc_id      TEXT NOT NULL REFERENCES knowledge_docs (id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  vector_id   TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc_id ON knowledge_chunks (doc_id);

-- ============================================================
-- 有人切替リクエスト
-- ============================================================
CREATE TABLE IF NOT EXISTS human_handover_requests (
  id           TEXT PRIMARY KEY,
  friend_id    TEXT NOT NULL REFERENCES friends (id) ON DELETE CASCADE,
  reason       TEXT,
  status       TEXT NOT NULL CHECK (status IN ('pending', 'claimed', 'resolved')) DEFAULT 'pending',
  operator_id  TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours')),
  resolved_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_human_handover_requests_status ON human_handover_requests (status);
CREATE INDEX IF NOT EXISTS idx_human_handover_requests_friend_id ON human_handover_requests (friend_id);

-- ============================================================
-- プロアクティブAI配信設定
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_proactive_configs (
  id               TEXT PRIMARY KEY,
  persona_id       TEXT NOT NULL REFERENCES ai_personas (id) ON DELETE CASCADE,
  trigger_type     TEXT NOT NULL CHECK (trigger_type IN ('score_threshold', 'tag_added', 'inactivity_days')),
  trigger_value    TEXT NOT NULL,
  message_template TEXT NOT NULL,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours'))
);
