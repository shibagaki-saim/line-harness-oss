import {
  getAiPersonaById, getAiProviderById,
  createAiConversation, updateAiConversation,
  getFriendByLineUserId,
  getHandoverRequestByFriend,
} from '@line-crm/db';
import { LineClient } from '@line-crm/line-sdk';
import type { Env } from '../index.js';

// QueueメッセージのPayload型
export type AiQueueMessage = {
  type: 'chat';
  friendId: string;
  lineUserId: string;
  userMessage: string;
  personaId: string;
  channelAccessToken: string;
  replyToken?: string;
};

function decrypt(encoded: string, _key: string): string {
  const decoded = atob(encoded);
  return decoded.slice(9);
}

async function callLLM(
  provider: { provider: string; model: string; api_key_enc: string | null; base_url: string | null },
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  maxTokens: number,
  encryptionKey: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const apiKey = provider.api_key_enc ? decrypt(provider.api_key_enc, encryptionKey) : '';

  if (provider.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });
    const data = await res.json() as {
      candidates?: { content: { parts: { text: string }[] } }[];
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '応答を生成できませんでした。';
    return {
      text,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  if (provider.provider === 'openai') {
    const baseUrl = provider.base_url ?? 'https://api.openai.com/v1';
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    const data = await res.json() as {
      choices?: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    return {
      text: data.choices?.[0]?.message?.content ?? '応答を生成できませんでした。',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }

  if (provider.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: maxTokens,
      }),
    });
    const data = await res.json() as {
      content?: { text: string }[];
      usage?: { input_tokens: number; output_tokens: number };
    };
    return {
      text: data.content?.[0]?.text ?? '応答を生成できませんでした。',
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }

  return { text: '対応していないプロバイダーです。', inputTokens: 0, outputTokens: 0 };
}

export async function handleAiQueue(batch: MessageBatch, env: Env['Bindings']): Promise<void> {
  for (const msg of batch.messages) {
    const payload = msg.body as AiQueueMessage;

    if (payload.type !== 'chat') {
      msg.ack();
      continue;
    }

    const conversationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // 有人切替中はAI応答しない
      const handover = await getHandoverRequestByFriend(env.DB, payload.friendId);
      if (handover) {
        console.log(`Friend ${payload.friendId} is in handover, skipping AI response`);
        msg.ack();
        continue;
      }

      // ペルソナ・プロバイダー取得
      const persona = await getAiPersonaById(env.DB, payload.personaId);
      if (!persona || !persona.is_active) {
        msg.ack();
        continue;
      }
      const provider = await getAiProviderById(env.DB, persona.provider_id);
      if (!provider || !provider.is_active) {
        msg.ack();
        continue;
      }

      // 会話ログ作成（pending）
      await createAiConversation(env.DB, {
        id: conversationId,
        friend_id: payload.friendId,
        persona_id: payload.personaId,
        user_message: payload.userMessage,
        ai_response: null,
        model: provider.model,
        input_tokens: null,
        output_tokens: null,
        latency_ms: null,
        status: 'pending',
      });

      // LLM呼び出し
      const result = await callLLM(
        provider,
        persona.system_prompt,
        payload.userMessage,
        persona.temperature,
        persona.max_tokens,
        env.ENCRYPTION_KEY,
      );

      const latencyMs = Date.now() - startTime;

      // 会話ログ更新（completed）
      await updateAiConversation(env.DB, conversationId, {
        ai_response: result.text,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        latency_ms: latencyMs,
        status: 'completed',
      });

      // LINE返信
      const lineClient = new LineClient(payload.channelAccessToken);
      if (payload.replyToken) {
        await lineClient.replyMessage(payload.replyToken, [{ type: 'text', text: result.text }]);
      } else {
        await lineClient.pushMessage(payload.lineUserId, [{ type: 'text', text: result.text }]);
      }

      msg.ack();
    } catch (err) {
      console.error('AI Queue handler error:', err);
      await updateAiConversation(env.DB, conversationId, { status: 'failed' }).catch(() => {});
      msg.retry();
    }
  }
}
