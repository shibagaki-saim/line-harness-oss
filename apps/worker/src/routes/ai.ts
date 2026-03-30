import { Hono } from 'hono';
import {
  getAiProviders, getAiProviderById, createAiProvider, updateAiProvider, deleteAiProvider,
  getAiPersonas, getAiPersonaById, createAiPersona, updateAiPersona,
  getAiConversations,
  getKnowledgeDocs, createKnowledgeDoc, updateKnowledgeDocIndexed, createKnowledgeChunk,
  getPendingHandoverRequests, updateHandoverRequest,
  getAiProactiveConfigs, createAiProactiveConfig,
} from '@line-crm/db';
import type { Env } from '../index.js';

const ai = new Hono<Env>();

// ─── ユーティリティ ──────────────────────────────────────────

function encrypt(text: string, key: string): string {
  return btoa(`${key.slice(0, 8)}:${text}`);
}

function decrypt(encoded: string, key: string): string {
  const decoded = atob(encoded);
  return decoded.slice(9); // "xxxxxxxx:" の9文字を除去
}

// ─── AIプロバイダー ──────────────────────────────────────────

ai.get('/api/ai/providers', async (c) => {
  try {
    const providers = await getAiProviders(c.env.DB);
    return c.json({
      success: true,
      data: providers.map((p) => ({ ...p, api_key_enc: p.api_key_enc ? '***' : null })),
    });
  } catch (err) {
    console.error('GET /api/ai/providers error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

ai.post('/api/ai/providers', async (c) => {
  try {
    const body = await c.req.json<{
      name: string; provider: string; model: string; api_key?: string; base_url?: string;
    }>();
    if (!body.name || !body.provider || !body.model) {
      return c.json({ success: false, error: 'name, provider, model is required' }, 400);
    }
    const id = crypto.randomUUID();
    const apiKeyEnc = body.api_key ? encrypt(body.api_key, c.env.ENCRYPTION_KEY) : null;
    const provider = await createAiProvider(c.env.DB, {
      id,
      name: body.name,
      provider: body.provider as 'openai' | 'anthropic' | 'gemini' | 'ollama',
      model: body.model,
      api_key_enc: apiKeyEnc,
      base_url: body.base_url ?? null,
      is_active: 1,
    });
    return c.json({ success: true, data: { ...provider, api_key_enc: provider.api_key_enc ? '***' : null } }, 201);
  } catch (err) {
    console.error('POST /api/ai/providers error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

ai.put('/api/ai/providers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await getAiProviderById(c.env.DB, id);
    if (!existing) return c.json({ success: false, error: 'Not found' }, 404);
    const body = await c.req.json<{ name?: string; model?: string; api_key?: string; base_url?: string; is_active?: number }>();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.model !== undefined) updates.model = body.model;
    if (body.base_url !== undefined) updates.base_url = body.base_url;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.api_key) updates.api_key_enc = encrypt(body.api_key, c.env.ENCRYPTION_KEY);
    await updateAiProvider(c.env.DB, id, updates as Parameters<typeof updateAiProvider>[2]);
    return c.json({ success: true });
  } catch (err) {
    console.error('PUT /api/ai/providers/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

ai.delete('/api/ai/providers/:id', async (c) => {
  try {
    await deleteAiProvider(c.env.DB, c.req.param('id'));
    return c.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/ai/providers/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── AIペルソナ ──────────────────────────────────────────────

ai.get('/api/ai/personas', async (c) => {
  try {
    const personas = await getAiPersonas(c.env.DB);
    return c.json({ success: true, data: personas });
  } catch (err) {
    console.error('GET /api/ai/personas error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

ai.post('/api/ai/personas', async (c) => {
  try {
    const body = await c.req.json<{
      name: string; provider_id: string; system_prompt: string;
      temperature?: number; max_tokens?: number;
    }>();
    if (!body.name || !body.provider_id || !body.system_prompt) {
      return c.json({ success: false, error: 'name, provider_id, system_prompt is required' }, 400);
    }
    const provider = await getAiProviderById(c.env.DB, body.provider_id);
    if (!provider) return c.json({ success: false, error: 'Provider not found' }, 404);
    const persona = await createAiPersona(c.env.DB, {
      id: crypto.randomUUID(),
      name: body.name,
      provider_id: body.provider_id,
      system_prompt: body.system_prompt,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 500,
      is_active: 1,
    });
    return c.json({ success: true, data: persona }, 201);
  } catch (err) {
    console.error('POST /api/ai/personas error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

ai.put('/api/ai/personas/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await getAiPersonaById(c.env.DB, id);
    if (!existing) return c.json({ success: false, error: 'Not found' }, 404);
    const body = await c.req.json<Partial<{ name: string; system_prompt: string; temperature: number; max_tokens: number; is_active: number }>>();
    await updateAiPersona(c.env.DB, id, body);
    return c.json({ success: true });
  } catch (err) {
    console.error('PUT /api/ai/personas/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── AI会話ログ ──────────────────────────────────────────────

ai.get('/api/ai/conversations', async (c) => {
  try {
    const limit = Number(c.req.query('limit') ?? 50);
    const offset = Number(c.req.query('offset') ?? 0);
    const result = await getAiConversations(c.env.DB, limit, offset);
    return c.json({ success: true, data: result });
  } catch (err) {
    console.error('GET /api/ai/conversations error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── ナレッジベース ──────────────────────────────────────────

ai.get('/api/ai/knowledge', async (c) => {
  try {
    const docs = await getKnowledgeDocs(c.env.DB);
    return c.json({ success: true, data: docs });
  } catch (err) {
    console.error('GET /api/ai/knowledge error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

ai.post('/api/ai/knowledge', async (c) => {
  try {
    const body = await c.req.json<{ title: string; content: string; source_type?: string }>();
    if (!body.title || !body.content) {
      return c.json({ success: false, error: 'title and content are required' }, 400);
    }

    const docId = crypto.randomUUID();
    const doc = await createKnowledgeDoc(c.env.DB, {
      id: docId,
      title: body.title,
      content: body.content,
      source_type: (body.source_type as 'text' | 'url' | 'file') ?? 'text',
      chunk_count: 0,
      is_indexed: 0,
    });

    // テキストをチャンク分割（500文字ずつ）して保存
    const chunkSize = 500;
    const chunks: string[] = [];
    for (let i = 0; i < body.content.length; i += chunkSize) {
      chunks.push(body.content.slice(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      await createKnowledgeChunk(c.env.DB, {
        id: crypto.randomUUID(),
        doc_id: docId,
        chunk_index: i,
        content: chunks[i],
        vector_id: null,
      });
    }

    await updateKnowledgeDocIndexed(c.env.DB, docId, chunks.length);

    return c.json({ success: true, data: { ...doc, chunk_count: chunks.length, is_indexed: 1 } }, 201);
  } catch (err) {
    console.error('POST /api/ai/knowledge error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── 有人切替 ────────────────────────────────────────────────

ai.get('/api/ai/handover', async (c) => {
  try {
    const requests = await getPendingHandoverRequests(c.env.DB);
    return c.json({ success: true, data: requests });
  } catch (err) {
    console.error('GET /api/ai/handover error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

ai.post('/api/ai/handover/:id/claim', async (c) => {
  try {
    const staff = c.get('staff');
    await updateHandoverRequest(c.env.DB, c.req.param('id'), 'claimed', staff.id);
    return c.json({ success: true });
  } catch (err) {
    console.error('POST /api/ai/handover/:id/claim error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

ai.post('/api/ai/handover/:id/resolve', async (c) => {
  try {
    await updateHandoverRequest(c.env.DB, c.req.param('id'), 'resolved');
    return c.json({ success: true });
  } catch (err) {
    console.error('POST /api/ai/handover/:id/resolve error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── プロアクティブ設定 ──────────────────────────────────────

ai.get('/api/ai/proactive', async (c) => {
  try {
    const configs = await getAiProactiveConfigs(c.env.DB);
    return c.json({ success: true, data: configs });
  } catch (err) {
    console.error('GET /api/ai/proactive error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

ai.post('/api/ai/proactive', async (c) => {
  try {
    const body = await c.req.json<{
      persona_id: string; trigger_type: string; trigger_value: string; message_template: string;
    }>();
    if (!body.persona_id || !body.trigger_type || !body.trigger_value || !body.message_template) {
      return c.json({ success: false, error: 'All fields required' }, 400);
    }
    const config = await createAiProactiveConfig(c.env.DB, {
      id: crypto.randomUUID(),
      persona_id: body.persona_id,
      trigger_type: body.trigger_type as 'score_threshold' | 'tag_added' | 'inactivity_days',
      trigger_value: body.trigger_value,
      message_template: body.message_template,
      is_active: 1,
    });
    return c.json({ success: true, data: config }, 201);
  } catch (err) {
    console.error('POST /api/ai/proactive error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export { ai };
