import { Hono } from 'hono';
import {
  getBroadcasts,
  getBroadcastById,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
} from '@line-crm/db';
import type { Broadcast as DbBroadcast, BroadcastMessageType, BroadcastTargetType } from '@line-crm/db';
import { LineClient } from '@line-crm/line-sdk';
import { processBroadcastSend } from '../services/broadcast.js';
import { processSegmentSend } from '../services/segment-send.js';
import type { SegmentCondition } from '../services/segment-query.js';
import type { Env } from '../index.js';

const broadcasts = new Hono<Env>();

function serializeBroadcast(row: DbBroadcast) {
  return {
    id: row.id,
    title: row.title,
    messageType: row.message_type,
    messageContent: row.message_content,
    targetType: row.target_type,
    targetTagId: row.target_tag_id,
    status: row.status,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    totalCount: row.total_count,
    successCount: row.success_count,
    createdAt: row.created_at,
  };
}

// GET /api/broadcasts - list all
broadcasts.get('/api/broadcasts', async (c) => {
  try {
    const lineAccountId = c.req.query('lineAccountId');
    let items: DbBroadcast[];
    if (lineAccountId) {
      const result = await c.env.DB
        .prepare(`SELECT * FROM broadcasts WHERE (line_account_id = ? OR line_account_id IS NULL) ORDER BY created_at DESC`)
        .bind(lineAccountId)
        .all<DbBroadcast>();
      items = result.results;
    } else {
      items = await getBroadcasts(c.env.DB);
    }
    return c.json({ success: true, data: items.map(serializeBroadcast) });
  } catch (err) {
    console.error('GET /api/broadcasts error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/broadcasts/:id - get single
broadcasts.get('/api/broadcasts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const broadcast = await getBroadcastById(c.env.DB, id);

    if (!broadcast) {
      return c.json({ success: false, error: 'Broadcast not found' }, 404);
    }

    return c.json({ success: true, data: serializeBroadcast(broadcast) });
  } catch (err) {
    console.error('GET /api/broadcasts/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/broadcasts - create
broadcasts.post('/api/broadcasts', async (c) => {
  try {
    const body = await c.req.json<{
      title: string;
      messageType: BroadcastMessageType;
      messageContent: string;
      targetType: BroadcastTargetType;
      targetTagId?: string | null;
      scheduledAt?: string | null;
      lineAccountId?: string | null;
      altText?: string | null;
    }>();

    if (!body.title || !body.messageType || !body.messageContent || !body.targetType) {
      return c.json(
        { success: false, error: 'title, messageType, messageContent, and targetType are required' },
        400,
      );
    }

    if (body.targetType === 'tag' && !body.targetTagId) {
      return c.json(
        { success: false, error: 'targetTagId is required when targetType is "tag"' },
        400,
      );
    }

    const broadcast = await createBroadcast(c.env.DB, {
      title: body.title,
      messageType: body.messageType,
      messageContent: body.messageContent,
      targetType: body.targetType,
      targetTagId: body.targetTagId ?? null,
      scheduledAt: body.scheduledAt ?? null,
    });

    // Save line_account_id and alt_text if provided
    const updates: string[] = [];
    const binds: unknown[] = [];
    if (body.lineAccountId) { updates.push('line_account_id = ?'); binds.push(body.lineAccountId); }
    if (body.altText) { updates.push('alt_text = ?'); binds.push(body.altText); }
    if (updates.length > 0) {
      binds.push(broadcast.id);
      await c.env.DB.prepare(`UPDATE broadcasts SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...binds).run();
    }

    return c.json({ success: true, data: serializeBroadcast(broadcast) }, 201);
  } catch (err) {
    console.error('POST /api/broadcasts error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// PUT /api/broadcasts/:id - update draft
broadcasts.put('/api/broadcasts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await getBroadcastById(c.env.DB, id);

    if (!existing) {
      return c.json({ success: false, error: 'Broadcast not found' }, 404);
    }

    if (existing.status !== 'draft' && existing.status !== 'scheduled') {
      return c.json({ success: false, error: 'Only draft or scheduled broadcasts can be updated' }, 400);
    }

    const body = await c.req.json<{
      title?: string;
      messageType?: BroadcastMessageType;
      messageContent?: string;
      targetType?: BroadcastTargetType;
      targetTagId?: string | null;
      scheduledAt?: string | null;
    }>();

    // Keep status in sync with scheduledAt changes
    let statusUpdate: 'draft' | 'scheduled' | undefined;
    if (body.scheduledAt !== undefined) {
      statusUpdate = body.scheduledAt ? 'scheduled' : 'draft';
    }

    const updated = await updateBroadcast(c.env.DB, id, {
      title: body.title,
      message_type: body.messageType,
      message_content: body.messageContent,
      target_type: body.targetType,
      target_tag_id: body.targetTagId,
      scheduled_at: body.scheduledAt,
      ...(statusUpdate !== undefined ? { status: statusUpdate } : {}),
    });

    return c.json({ success: true, data: updated ? serializeBroadcast(updated) : null });
  } catch (err) {
    console.error('PUT /api/broadcasts/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// DELETE /api/broadcasts/:id - delete
broadcasts.delete('/api/broadcasts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await deleteBroadcast(c.env.DB, id);
    return c.json({ success: true, data: null });
  } catch (err) {
    console.error('DELETE /api/broadcasts/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/broadcasts/:id/send - send now
broadcasts.post('/api/broadcasts/:id/send', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await getBroadcastById(c.env.DB, id);

    if (!existing) {
      return c.json({ success: false, error: 'Broadcast not found' }, 404);
    }

    if (existing.status === 'sending' || existing.status === 'sent') {
      return c.json({ success: false, error: 'Broadcast is already sent or sending' }, 400);
    }

    const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
    await processBroadcastSend(c.env.DB, lineClient, id, c.env.WORKER_URL);

    const result = await getBroadcastById(c.env.DB, id);
    return c.json({ success: true, data: result ? serializeBroadcast(result) : null });
  } catch (err) {
    console.error('POST /api/broadcasts/:id/send error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/broadcasts/:id/report — 個別配信レポート（送信数・クリック数・CTR）
broadcasts.get('/api/broadcasts/:id/report', async (c) => {
  try {
    const id = c.req.param('id');
    const broadcast = await getBroadcastById(c.env.DB, id);
    if (!broadcast) {
      return c.json({ success: false, error: 'Broadcast not found' }, 404);
    }

    // クリック数（このbroadcastに紐付いたもの）
    const clickRow = await c.env.DB
      .prepare(`SELECT COUNT(*) as cnt FROM link_clicks WHERE broadcast_id = ?`)
      .bind(id)
      .first<{ cnt: number }>();
    const clickCount = clickRow?.cnt ?? 0;

    // クリックした友だちリスト（ユニーク・最新10件）
    const clicksResult = await c.env.DB
      .prepare(
        `SELECT lc.id, lc.friend_id, f.display_name, lc.clicked_at, tl.name as link_name, tl.original_url
         FROM link_clicks lc
         LEFT JOIN friends f ON f.id = lc.friend_id
         LEFT JOIN tracked_links tl ON tl.id = lc.tracked_link_id
         WHERE lc.broadcast_id = ?
         ORDER BY lc.clicked_at DESC
         LIMIT 50`,
      )
      .bind(id)
      .all<{ id: string; friend_id: string | null; display_name: string | null; clicked_at: string; link_name: string | null; original_url: string | null }>();

    const totalCount = broadcast.total_count;
    const ctr = totalCount > 0 ? Math.round((clickCount / totalCount) * 1000) / 10 : null;

    return c.json({
      success: true,
      data: {
        broadcastId: id,
        title: broadcast.title,
        status: broadcast.status,
        totalCount,
        successCount: broadcast.success_count,
        clickCount,
        ctr,
        sentAt: broadcast.sent_at,
        clicks: clicksResult.results.map((r) => ({
          id: r.id,
          friendId: r.friend_id,
          friendName: r.display_name,
          clickedAt: r.clicked_at,
          linkName: r.link_name,
          originalUrl: r.original_url,
        })),
      },
    });
  } catch (err) {
    console.error('GET /api/broadcasts/:id/report error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/broadcasts/:id/preview — 送信前確認（対象件数・内容を返す、実際には送信しない）
broadcasts.post('/api/broadcasts/:id/preview', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await getBroadcastById(c.env.DB, id);

    if (!existing) {
      return c.json({ success: false, error: 'Broadcast not found' }, 404);
    }

    let recipientCount: number;
    if (existing.target_type === 'all') {
      const row = await c.env.DB
        .prepare(`SELECT COUNT(*) as cnt FROM friends WHERE is_following = 1`)
        .first<{ cnt: number }>();
      recipientCount = row?.cnt ?? 0;
    } else {
      const row = await c.env.DB
        .prepare(
          `SELECT COUNT(*) as cnt FROM friends f
           INNER JOIN friend_tags ft ON ft.friend_id = f.id
           WHERE f.is_following = 1 AND ft.tag_id = ?`,
        )
        .bind(existing.target_tag_id)
        .first<{ cnt: number }>();
      recipientCount = row?.cnt ?? 0;
    }

    return c.json({
      success: true,
      data: {
        recipientCount,
        title: existing.title,
        messageType: existing.message_type,
        messageContent: existing.message_content,
        targetType: existing.target_type,
        targetTagId: existing.target_tag_id,
      },
    });
  } catch (err) {
    console.error('POST /api/broadcasts/:id/preview error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/broadcasts/:id/send-segment - send to a filtered segment
broadcasts.post('/api/broadcasts/:id/send-segment', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await getBroadcastById(c.env.DB, id);

    if (!existing) {
      return c.json({ success: false, error: 'Broadcast not found' }, 404);
    }

    if (existing.status === 'sending' || existing.status === 'sent') {
      return c.json({ success: false, error: 'Broadcast is already sent or sending' }, 400);
    }

    const body = await c.req.json<{ conditions: SegmentCondition }>();

    if (!body.conditions || !body.conditions.operator || !Array.isArray(body.conditions.rules)) {
      return c.json(
        { success: false, error: 'conditions with operator and rules array is required' },
        400,
      );
    }

    const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
    await processSegmentSend(c.env.DB, lineClient, id, body.conditions);

    const result = await getBroadcastById(c.env.DB, id);
    return c.json({ success: true, data: result ? serializeBroadcast(result) : null });
  } catch (err) {
    console.error('POST /api/broadcasts/:id/send-segment error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export { broadcasts };
