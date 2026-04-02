import type {
  Friend,
  Tag,
  Scenario,
  ScenarioStep,
  ApiResponse,
  PaginatedResponse,
  User,
  LineAccount,
  ConversionPoint,
  Affiliate,
  Template,
  Automation,
  AutomationLog,
  Chat,
  Reminder,
  ReminderStep,
  ScoringRule,
  IncomingWebhook,
  OutgoingWebhook,
  NotificationRule,
  Notification,
  AccountHealthLog,
  AccountMigration,
  StaffMember,
} from '@line-crm/shared'

import type { Broadcast } from '@line-crm/shared'

/** Broadcast type from API (now camelCase after worker serialization) */
export type ApiBroadcast = Broadcast

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://line-harness.shibagaki.workers.dev'

/**
 * Read the session token from localStorage (set during login).
 * Never embed secrets in the client bundle via NEXT_PUBLIC_* env vars.
 */
function getSessionToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('lh_session_token') || ''
  }
  return ''
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSessionToken()}`,
      ...options?.headers,
    },
  })
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('lh_session_token')
    localStorage.removeItem('lh_staff_name')
    localStorage.removeItem('lh_staff_role')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}

export type FriendListParams = {
  offset?: string
  limit?: string
  tagId?: string
  accountId?: string
}

export type FriendWithTags = Friend & { tags: Tag[] }

export const api = {
  friends: {
    list: (params?: FriendListParams) => {
      const query: Record<string, string> = {}
      if (params?.offset) query.offset = params.offset
      if (params?.limit) query.limit = params.limit
      if (params?.tagId) query.tagId = params.tagId
      if (params?.accountId) query.lineAccountId = params.accountId
      return fetchApi<ApiResponse<PaginatedResponse<FriendWithTags>>>(
        '/api/friends?' + new URLSearchParams(query)
      )
    },
    get: (id: string) =>
      fetchApi<ApiResponse<FriendWithTags>>(`/api/friends/${id}`),
    count: (params?: { accountId?: string }) => {
      const query = params?.accountId ? '?lineAccountId=' + params.accountId : ''
      return fetchApi<ApiResponse<{ count: number }>>('/api/friends/count' + query)
    },
    addTag: (friendId: string, tagId: string) =>
      fetchApi<ApiResponse<null>>(`/api/friends/${friendId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tagId }),
      }),
    removeTag: (friendId: string, tagId: string) =>
      fetchApi<ApiResponse<null>>(`/api/friends/${friendId}/tags/${tagId}`, {
        method: 'DELETE',
      }),
  },
  tags: {
    list: () =>
      fetchApi<ApiResponse<Tag[]>>('/api/tags'),
    create: (data: { name: string; color: string }) =>
      fetchApi<ApiResponse<Tag>>('/api/tags', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/tags/${id}`, { method: 'DELETE' }),
  },
  scenarios: {
    list: (params?: { accountId?: string }) => {
      const query = params?.accountId ? '?lineAccountId=' + params.accountId : ''
      return fetchApi<ApiResponse<(Scenario & { stepCount?: number })[]>>('/api/scenarios' + query)
    },
    get: (id: string) =>
      fetchApi<ApiResponse<Scenario & { steps: ScenarioStep[] }>>(`/api/scenarios/${id}`),
    create: (data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'> & { lineAccountId?: string }) =>
      fetchApi<ApiResponse<Scenario>>('/api/scenarios', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>>) =>
      fetchApi<ApiResponse<Scenario>>(`/api/scenarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/scenarios/${id}`, { method: 'DELETE' }),
    addStep: (id: string, data: Omit<ScenarioStep, 'id' | 'scenarioId' | 'createdAt'>) =>
      fetchApi<ApiResponse<ScenarioStep>>(`/api/scenarios/${id}/steps`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStep: (
      id: string,
      stepId: string,
      data: Partial<Omit<ScenarioStep, 'id' | 'scenarioId' | 'createdAt'>>
    ) =>
      fetchApi<ApiResponse<ScenarioStep>>(`/api/scenarios/${id}/steps/${stepId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteStep: (id: string, stepId: string) =>
      fetchApi<ApiResponse<null>>(`/api/scenarios/${id}/steps/${stepId}`, {
        method: 'DELETE',
      }),
  },
  broadcasts: {
    list: (params?: { accountId?: string }) => {
      const query = params?.accountId ? '?lineAccountId=' + params.accountId : ''
      return fetchApi<ApiResponse<ApiBroadcast[]>>('/api/broadcasts' + query)
    },
    get: (id: string) =>
      fetchApi<ApiResponse<ApiBroadcast>>(`/api/broadcasts/${id}`),
    create: (data: {
      title: string
      messageType: ApiBroadcast['messageType']
      messageContent: string
      targetType: ApiBroadcast['targetType']
      targetTagId?: string | null
      scheduledAt?: string | null
      status?: ApiBroadcast['status']
    }) =>
      fetchApi<ApiResponse<ApiBroadcast>>('/api/broadcasts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: {
        title?: string
        messageType?: ApiBroadcast['messageType']
        messageContent?: string
        targetType?: ApiBroadcast['targetType']
        targetTagId?: string | null
        scheduledAt?: string | null
      }
    ) =>
      fetchApi<ApiResponse<ApiBroadcast>>(`/api/broadcasts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/broadcasts/${id}`, { method: 'DELETE' }),
    send: (id: string) =>
      fetchApi<ApiResponse<ApiBroadcast>>(`/api/broadcasts/${id}/send`, { method: 'POST' }),
    preview: (id: string) =>
      fetchApi<ApiResponse<{
        recipientCount: number
        title: string
        messageType: string
        messageContent: string
        targetType: string
        targetTagId: string | null
      }>>(`/api/broadcasts/${id}/preview`, { method: 'POST' }),
    report: (id: string) =>
      fetchApi<ApiResponse<{
        broadcastId: string
        title: string
        status: string
        totalCount: number
        successCount: number
        clickCount: number
        ctr: number | null
        sentAt: string | null
        clicks: Array<{
          id: string
          friendId: string | null
          friendName: string | null
          clickedAt: string
          linkName: string | null
          originalUrl: string | null
        }>
      }>>(`/api/broadcasts/${id}/report`),
  },

  // ── Round 2 APIs ─────────────────────────────────────────────────────────
  users: {
    list: () =>
      fetchApi<ApiResponse<User[]>>('/api/users'),
    get: (id: string) =>
      fetchApi<ApiResponse<User>>(`/api/users/${id}`),
    create: (data: { email?: string | null; phone?: string | null; externalId?: string | null; displayName?: string | null }) =>
      fetchApi<ApiResponse<User>>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Pick<User, 'email' | 'phone' | 'externalId' | 'displayName'>>) =>
      fetchApi<ApiResponse<User>>(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/users/${id}`, { method: 'DELETE' }),
    link: (userId: string, friendId: string) =>
      fetchApi<ApiResponse<null>>(`/api/users/${userId}/link`, {
        method: 'POST',
        body: JSON.stringify({ friendId }),
      }),
    accounts: (userId: string) =>
      fetchApi<ApiResponse<{ id: string; lineUserId: string; displayName: string | null; isFollowing: boolean }[]>>(
        `/api/users/${userId}/accounts`,
      ),
  },
  lineAccounts: {
    list: () =>
      fetchApi<ApiResponse<LineAccount[]>>('/api/line-accounts'),
    get: (id: string) =>
      fetchApi<ApiResponse<LineAccount>>(`/api/line-accounts/${id}`),
    create: (data: { channelId: string; name: string; channelAccessToken: string; channelSecret: string }) =>
      fetchApi<ApiResponse<LineAccount>>('/api/line-accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Pick<LineAccount, 'name' | 'channelAccessToken' | 'channelSecret' | 'isActive'>>) =>
      fetchApi<ApiResponse<LineAccount>>(`/api/line-accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/line-accounts/${id}`, { method: 'DELETE' }),
  },
  conversions: {
    points: () =>
      fetchApi<ApiResponse<ConversionPoint[]>>('/api/conversions/points'),
    createPoint: (data: { name: string; eventType: string; value?: number | null }) =>
      fetchApi<ApiResponse<ConversionPoint>>('/api/conversions/points', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deletePoint: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/conversions/points/${id}`, { method: 'DELETE' }),
    track: (data: { conversionPointId: string; friendId: string; userId?: string | null; affiliateCode?: string | null; metadata?: Record<string, unknown> | null }) =>
      fetchApi<ApiResponse<unknown>>('/api/conversions/track', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    report: (params?: { startDate?: string; endDate?: string }) =>
      fetchApi<ApiResponse<{ conversionPointId: string; conversionPointName: string; eventType: string; totalCount: number; totalValue: number }[]>>(
        '/api/conversions/report?' + new URLSearchParams(params as Record<string, string>),
      ),
  },
  affiliates: {
    list: () =>
      fetchApi<ApiResponse<Affiliate[]>>('/api/affiliates'),
    get: (id: string) =>
      fetchApi<ApiResponse<Affiliate>>(`/api/affiliates/${id}`),
    create: (data: { name: string; code: string; commissionRate?: number }) =>
      fetchApi<ApiResponse<Affiliate>>('/api/affiliates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Pick<Affiliate, 'name' | 'commissionRate' | 'isActive'>>) =>
      fetchApi<ApiResponse<Affiliate>>(`/api/affiliates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/affiliates/${id}`, { method: 'DELETE' }),
    report: (id: string, params?: { startDate?: string; endDate?: string }) =>
      fetchApi<ApiResponse<{ affiliateId: string; affiliateName: string; code: string; commissionRate: number; totalClicks: number; totalConversions: number; totalRevenue: number }>>(
        `/api/affiliates/${id}/report?` + new URLSearchParams(params as Record<string, string>),
      ),
  },
  templates: {
    list: (category?: string) =>
      fetchApi<ApiResponse<{ id: string; name: string; category: string; messageType: string; messageContent: string; createdAt: string; updatedAt: string }[]>>(
        '/api/templates' + (category ? '?' + new URLSearchParams({ category }) : ''),
      ),
    get: (id: string) =>
      fetchApi<ApiResponse<{ id: string; name: string; category: string; messageType: string; messageContent: string; createdAt: string; updatedAt: string }>>(
        `/api/templates/${id}`,
      ),
    create: (data: { name: string; category: string; messageType: string; messageContent: string }) =>
      fetchApi<ApiResponse<{ id: string; name: string; category: string; messageType: string; messageContent: string; createdAt: string; updatedAt: string }>>(
        '/api/templates',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    update: (id: string, data: Partial<{ name: string; category: string; messageType: string; messageContent: string }>) =>
      fetchApi<ApiResponse<{ id: string; name: string; category: string; messageType: string; messageContent: string; createdAt: string; updatedAt: string }>>(
        `/api/templates/${id}`,
        { method: 'PUT', body: JSON.stringify(data) },
      ),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/templates/${id}`, { method: 'DELETE' }),
  },
  automations: {
    list: (params?: { accountId?: string }) => {
      const query = params?.accountId ? '?lineAccountId=' + params.accountId : ''
      return fetchApi<ApiResponse<Automation[]>>('/api/automations' + query)
    },
    get: (id: string) =>
      fetchApi<ApiResponse<Automation & { logs?: AutomationLog[] }>>(`/api/automations/${id}`),
    create: (data: {
      name: string
      eventType: Automation['eventType']
      actions: Automation['actions']
      description?: string | null
      conditions?: Record<string, unknown>
      priority?: number
    }) =>
      fetchApi<ApiResponse<Automation>>('/api/automations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Pick<Automation, 'name' | 'description' | 'eventType' | 'conditions' | 'actions' | 'isActive' | 'priority'>>) =>
      fetchApi<ApiResponse<Automation>>(`/api/automations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/automations/${id}`, { method: 'DELETE' }),
    logs: (id: string, limit?: number) =>
      fetchApi<ApiResponse<AutomationLog[]>>(
        `/api/automations/${id}/logs` + (limit ? `?limit=${limit}` : ''),
      ),
  },
  chats: {
    list: (params?: { status?: string; operatorId?: string; accountId?: string }) => {
      const query: Record<string, string> = {}
      if (params?.status) query.status = params.status
      if (params?.operatorId) query.operatorId = params.operatorId
      if (params?.accountId) query.lineAccountId = params.accountId
      return fetchApi<ApiResponse<Chat[]>>(
        '/api/chats?' + new URLSearchParams(query),
      )
    },
    get: (id: string) =>
      fetchApi<ApiResponse<Chat & { messages?: { id: string; content: string; senderType: string; createdAt: string }[] }>>(
        `/api/chats/${id}`,
      ),
    create: (data: { friendId: string; operatorId?: string | null }) =>
      fetchApi<ApiResponse<Chat>>('/api/chats', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { operatorId?: string | null; status?: Chat['status']; notes?: string | null }) =>
      fetchApi<ApiResponse<Chat>>(`/api/chats/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    send: (id: string, data: { content: string; messageType?: string }) =>
      fetchApi<ApiResponse<unknown>>(`/api/chats/${id}/send`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  reminders: {
    list: (params?: { accountId?: string }) => {
      const query = params?.accountId ? '?lineAccountId=' + params.accountId : ''
      return fetchApi<ApiResponse<Reminder[]>>('/api/reminders' + query)
    },
    get: (id: string) =>
      fetchApi<ApiResponse<Reminder & { steps: ReminderStep[] }>>(`/api/reminders/${id}`),
    create: (data: { name: string; description?: string | null }) =>
      fetchApi<ApiResponse<Reminder>>('/api/reminders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Pick<Reminder, 'name' | 'description' | 'isActive'>>) =>
      fetchApi<ApiResponse<Reminder>>(`/api/reminders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/reminders/${id}`, { method: 'DELETE' }),
    addStep: (id: string, data: { offsetMinutes: number; messageType: string; messageContent: string }) =>
      fetchApi<ApiResponse<ReminderStep>>(`/api/reminders/${id}/steps`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteStep: (reminderId: string, stepId: string) =>
      fetchApi<ApiResponse<null>>(`/api/reminders/${reminderId}/steps/${stepId}`, {
        method: 'DELETE',
      }),
  },
  scoring: {
    rules: () =>
      fetchApi<ApiResponse<ScoringRule[]>>('/api/scoring-rules'),
    getRule: (id: string) =>
      fetchApi<ApiResponse<ScoringRule>>(`/api/scoring-rules/${id}`),
    createRule: (data: { name: string; eventType: string; scoreValue: number }) =>
      fetchApi<ApiResponse<ScoringRule>>('/api/scoring-rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateRule: (id: string, data: Partial<Pick<ScoringRule, 'name' | 'eventType' | 'scoreValue' | 'isActive'>>) =>
      fetchApi<ApiResponse<ScoringRule>>(`/api/scoring-rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteRule: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/scoring-rules/${id}`, { method: 'DELETE' }),
    friendScore: (friendId: string) =>
      fetchApi<ApiResponse<{ totalScore: number; history: { id: string; scoreChange: number; reason: string | null; createdAt: string }[] }>>(
        `/api/friends/${friendId}/score`,
      ),
  },
  webhooks: {
    incoming: {
      list: () =>
        fetchApi<ApiResponse<IncomingWebhook[]>>('/api/webhooks/incoming'),
      create: (data: { name: string; sourceType?: string; secret?: string | null }) =>
        fetchApi<ApiResponse<IncomingWebhook>>('/api/webhooks/incoming', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Partial<Pick<IncomingWebhook, 'name' | 'sourceType' | 'isActive'>>) =>
        fetchApi<ApiResponse<IncomingWebhook>>(`/api/webhooks/incoming/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        fetchApi<ApiResponse<null>>(`/api/webhooks/incoming/${id}`, { method: 'DELETE' }),
    },
    outgoing: {
      list: () =>
        fetchApi<ApiResponse<OutgoingWebhook[]>>('/api/webhooks/outgoing'),
      create: (data: { name: string; url: string; eventTypes: string[]; secret?: string | null }) =>
        fetchApi<ApiResponse<OutgoingWebhook>>('/api/webhooks/outgoing', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Partial<Pick<OutgoingWebhook, 'name' | 'url' | 'eventTypes' | 'isActive'>>) =>
        fetchApi<ApiResponse<OutgoingWebhook>>(`/api/webhooks/outgoing/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        fetchApi<ApiResponse<null>>(`/api/webhooks/outgoing/${id}`, { method: 'DELETE' }),
    },
  },
  notifications: {
    rules: {
      list: () =>
        fetchApi<ApiResponse<NotificationRule[]>>('/api/notifications/rules'),
      get: (id: string) =>
        fetchApi<ApiResponse<NotificationRule>>(`/api/notifications/rules/${id}`),
      create: (data: { name: string; eventType: string; conditions?: Record<string, unknown>; channels?: string[] }) =>
        fetchApi<ApiResponse<NotificationRule>>('/api/notifications/rules', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Partial<Pick<NotificationRule, 'name' | 'eventType' | 'conditions' | 'channels' | 'isActive'>>) =>
        fetchApi<ApiResponse<NotificationRule>>(`/api/notifications/rules/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        fetchApi<ApiResponse<null>>(`/api/notifications/rules/${id}`, { method: 'DELETE' }),
    },
    list: (params?: { status?: string; limit?: string }) =>
      fetchApi<ApiResponse<Notification[]>>(
        '/api/notifications?' + new URLSearchParams(params as Record<string, string>),
      ),
  },
  health: {
    accounts: () =>
      fetchApi<ApiResponse<LineAccount[]>>('/api/line-accounts'),
    getHealth: (accountId: string) =>
      fetchApi<ApiResponse<{ riskLevel: string; logs: AccountHealthLog[] }>>(
        `/api/accounts/${accountId}/health`,
      ),
    migrations: () =>
      fetchApi<ApiResponse<AccountMigration[]>>('/api/accounts/migrations'),
    migrate: (fromAccountId: string, data: { toAccountId: string }) =>
      fetchApi<ApiResponse<AccountMigration>>(`/api/accounts/${fromAccountId}/migrate`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMigration: (migrationId: string) =>
      fetchApi<ApiResponse<AccountMigration>>(`/api/accounts/migrations/${migrationId}`),
    refreshToken: (accountId: string) =>
      fetchApi<ApiResponse<LineAccount>>(`/api/line-accounts/${accountId}/refresh-token`, { method: 'POST' }),
  },
  staff: {
    list: () =>
      fetchApi<ApiResponse<StaffMember[]>>('/api/staff'),
    get: (id: string) =>
      fetchApi<ApiResponse<StaffMember>>(`/api/staff/${id}`),
    me: () =>
      fetchApi<ApiResponse<{ id: string; name: string; role: string; email: string | null }>>('/api/staff/me'),
    create: (data: { name: string; email?: string; role: 'admin' | 'staff' }) =>
      fetchApi<ApiResponse<StaffMember>>('/api/staff', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name?: string; email?: string | null; role?: string; isActive?: boolean }) =>
      fetchApi<ApiResponse<StaffMember>>(`/api/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<ApiResponse<null>>(`/api/staff/${id}`, { method: 'DELETE' }),
    regenerateKey: (id: string) =>
      fetchApi<ApiResponse<{ apiKey: string }>>(`/api/staff/${id}/regenerate-key`, { method: 'POST' }),
  },
  ai: {
    providers: {
      list: () => fetchApi<{ success: boolean; data: AiProvider[] }>('/api/ai/providers'),
      create: (data: { name: string; provider: string; model: string; api_key?: string; base_url?: string }) =>
        fetchApi<{ success: boolean; data: AiProvider }>('/api/ai/providers', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: { name?: string; model?: string; api_key?: string; base_url?: string; is_active?: number }) =>
        fetchApi<{ success: boolean }>(`/api/ai/providers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        fetchApi<{ success: boolean }>(`/api/ai/providers/${id}`, { method: 'DELETE' }),
    },
    personas: {
      list: () => fetchApi<{ success: boolean; data: AiPersona[] }>('/api/ai/personas'),
      create: (data: { name: string; provider_id: string; system_prompt: string; temperature?: number; max_tokens?: number }) =>
        fetchApi<{ success: boolean; data: AiPersona }>('/api/ai/personas', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: { name?: string; system_prompt?: string; temperature?: number; max_tokens?: number; is_active?: number }) =>
        fetchApi<{ success: boolean }>(`/api/ai/personas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    },
    conversations: {
      list: (params?: { limit?: number; offset?: number }) => {
        const q = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))) : ''
        return fetchApi<{ success: boolean; data: { items: AiConversation[]; total: number } }>(`/api/ai/conversations${q}`)
      },
    },
    knowledge: {
      list: () => fetchApi<{ success: boolean; data: KnowledgeDoc[] }>('/api/ai/knowledge'),
      create: (data: { title: string; content: string; source_type?: string }) =>
        fetchApi<{ success: boolean; data: KnowledgeDoc }>('/api/ai/knowledge', { method: 'POST', body: JSON.stringify(data) }),
    },
    handover: {
      list: () => fetchApi<{ success: boolean; data: HandoverRequest[] }>('/api/ai/handover'),
      claim: (id: string) =>
        fetchApi<{ success: boolean }>(`/api/ai/handover/${id}/claim`, { method: 'POST' }),
      resolve: (id: string) =>
        fetchApi<{ success: boolean }>(`/api/ai/handover/${id}/resolve`, { method: 'POST' }),
    },
    proactive: {
      list: () => fetchApi<{ success: boolean; data: AiProactiveConfig[] }>('/api/ai/proactive'),
      create: (data: { persona_id: string; trigger_type: string; trigger_value: string; message_template: string }) =>
        fetchApi<{ success: boolean; data: AiProactiveConfig }>('/api/ai/proactive', { method: 'POST', body: JSON.stringify(data) }),
    },
  },
  flows: {
    list: () => fetchApi<{ success: boolean; data: Flow[] }>('/api/flows'),
    get: (id: string) => fetchApi<{ success: boolean; data: Flow }>(`/api/flows/${id}`),
    create: (data: { name: string; description?: string; trigger_type?: string; nodes?: string; edges?: string; is_active?: number }) =>
      fetchApi<{ success: boolean; data: Flow }>('/api/flows', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string; trigger_type?: string; trigger_value?: string; nodes?: string; edges?: string; is_active?: number }) =>
      fetchApi<{ success: boolean }>(`/api/flows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi<{ success: boolean }>(`/api/flows/${id}`, { method: 'DELETE' }),
    trigger: (id: string, friendId?: string) =>
      fetchApi<{ success: boolean; data: FlowExecution }>(`/api/flows/${id}/trigger`, { method: 'POST', body: JSON.stringify({ friend_id: friendId }) }),
    executions: (id: string) => fetchApi<{ success: boolean; data: FlowExecution[] }>(`/api/flows/${id}/executions`),
    executionLogs: (executionId: string) => fetchApi<{ success: boolean; data: FlowExecutionLog[] }>(`/api/flows/executions/${executionId}/logs`),
  },
  asp: {
    campaigns: {
      list: () => fetchApi<{ success: boolean; data: AspCampaign[] }>('/api/asp/campaigns'),
      get: (id: string) => fetchApi<{ success: boolean; data: AspCampaign }>(`/api/asp/campaigns/${id}`),
      create: (data: { name: string; description?: string | null; commissionRate?: number; startDate?: string | null; endDate?: string | null }) =>
        fetchApi<{ success: boolean; data: AspCampaign }>('/api/asp/campaigns', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: { name?: string; description?: string | null; commissionRate?: number; isActive?: boolean; startDate?: string | null; endDate?: string | null }) =>
        fetchApi<{ success: boolean; data: AspCampaign }>(`/api/asp/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => fetchApi<{ success: boolean; data: null }>(`/api/asp/campaigns/${id}`, { method: 'DELETE' }),
    },
    rewards: {
      list: (params?: { status?: string; period?: string; affiliateId?: string }) =>
        fetchApi<{ success: boolean; data: AspReward[] }>('/api/asp/rewards?' + new URLSearchParams((params ?? {}) as Record<string, string>)),
      updateStatus: (id: string, status: string, note?: string | null) =>
        fetchApi<{ success: boolean; data: null }>(`/api/asp/rewards/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, note }) }),
      aggregate: (period?: string) =>
        fetchApi<{ success: boolean; data: { period: string } }>('/api/asp/rewards/aggregate', { method: 'POST', body: JSON.stringify({ period }) }),
    },
    fraudLogs: {
      list: (params?: { resolved?: boolean; affiliateId?: string }) => {
        const qs = new URLSearchParams();
        if (params?.resolved !== undefined) qs.set('resolved', String(params.resolved));
        if (params?.affiliateId) qs.set('affiliateId', params.affiliateId);
        return fetchApi<{ success: boolean; data: AspFraudLog[] }>(`/api/asp/fraud-logs?${qs}`);
      },
      resolve: (id: string) => fetchApi<{ success: boolean; data: null }>(`/api/asp/fraud-logs/${id}/resolve`, { method: 'POST' }),
    },
  },
  richMenus: {
    list: () => fetchApi<{ success: boolean; data: RichMenu[] }>('/api/rich-menus'),
    create: (body: RichMenuCreate) =>
      fetchApi<{ success: boolean; data: { richMenuId: string } }>('/api/rich-menus', {
        method: 'POST', body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      fetchApi<{ success: boolean; data: null }>(`/api/rich-menus/${id}`, { method: 'DELETE' }),
    setDefault: (id: string) =>
      fetchApi<{ success: boolean; data: null }>(`/api/rich-menus/${id}/default`, { method: 'POST' }),
    uploadImage: (id: string, base64: string, contentType: 'image/png' | 'image/jpeg') =>
      fetchApi<{ success: boolean; data: null }>(`/api/rich-menus/${id}/image`, {
        method: 'POST', body: JSON.stringify({ image: base64, contentType }),
      }),
  },
  analytics: {
    overview: (accountId?: string | null) => {
      const qs = accountId ? `?accountId=${accountId}` : '';
      return fetchApi<{ success: boolean; data: AnalyticsOverview }>(`/api/analytics/overview${qs}`);
    },
    friends: (days = 30, accountId?: string | null) => {
      const qs = new URLSearchParams({ days: String(days) });
      if (accountId) qs.set('accountId', accountId);
      return fetchApi<{ success: boolean; data: FriendDayCount[] }>(`/api/analytics/friends?${qs}`);
    },
    broadcasts: (limit = 10, accountId?: string | null) => {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (accountId) qs.set('accountId', accountId);
      return fetchApi<{ success: boolean; data: BroadcastStat[] }>(`/api/analytics/broadcasts?${qs}`);
    },
    flows: () => fetchApi<{ success: boolean; data: FlowAnalytics }>('/api/analytics/flows'),
    ai: (days = 30) =>
      fetchApi<{ success: boolean; data: AiAnalytics }>(`/api/analytics/ai?days=${days}`),
  },
}

// ─── Rich Menu types ──────────────────────────────────────────────────────────

export type RichMenuBounds = { x: number; y: number; width: number; height: number }
export type RichMenuAction =
  | { type: 'message'; text: string }
  | { type: 'uri'; uri: string }
  | { type: 'postback'; data: string; displayText?: string }
  | { type: 'datetimepicker'; data: string; mode: 'date' | 'time' | 'datetime' }

export type RichMenuArea = { bounds: RichMenuBounds; action: RichMenuAction }

export type RichMenu = {
  richMenuId: string
  size: { width: number; height: number }
  selected: boolean
  name: string
  chatBarText: string
  areas: RichMenuArea[]
}

export type RichMenuCreate = Omit<RichMenu, 'richMenuId' | 'selected'>

// ─── Analytics types ─────────────────────────────────────────────────────────

export type AnalyticsOverview = {
  total_friends: number;
  active_friends: number;
  total_broadcasts_sent: number;
  total_messages_sent: number;
}

export type FriendDayCount = {
  date: string;
  count: number;
}

export type BroadcastStat = {
  id: string;
  title: string;
  total_count: number;
  success_count: number;
  sent_at: string | null;
}

export type FlowAnalytics = {
  total_flows: number;
  active_flows: number;
  executions_running: number;
  executions_completed: number;
  executions_failed: number;
  executions_waiting: number;
}

export type AiAnalytics = {
  total: number;
  completed: number;
  failed: number;
  total_tokens: number;
}

// ─── AI types ───────────────────────────────────────────────────────────────

export type AiProvider = {
  id: string; name: string; provider: string; model: string;
  api_key_enc: string | null; base_url: string | null; is_active: number;
  created_at: string; updated_at: string;
}
export type AiPersona = {
  id: string; name: string; provider_id: string; system_prompt: string;
  temperature: number; max_tokens: number; is_active: number;
  created_at: string; updated_at: string;
}
export type AiConversation = {
  id: string; friend_id: string; persona_id: string;
  user_message: string; ai_response: string | null; model: string;
  input_tokens: number | null; output_tokens: number | null;
  latency_ms: number | null; status: string; created_at: string;
  friend_name?: string;
}
export type KnowledgeDoc = {
  id: string; title: string; content: string; source_type: string;
  chunk_count: number; is_indexed: number; created_at: string; updated_at: string;
}
export type HandoverRequest = {
  id: string; friend_id: string; reason: string | null;
  status: string; claimed_by: string | null; created_at: string; updated_at: string;
  friend_name?: string;
}
export type AiProactiveConfig = {
  id: string; persona_id: string; trigger_type: string; trigger_value: string;
  message_template: string; is_active: number; created_at: string; updated_at: string;
}

// ─── Flow types ─────────────────────────────────────────────────────────────

export type Flow = {
  id: string; name: string; description: string | null;
  trigger_type: string; trigger_value: string | null;
  nodes: string; edges: string;
  is_active: number; created_at: string; updated_at: string;
}
export type FlowExecution = {
  id: string; flow_id: string; friend_id: string | null;
  status: 'running' | 'completed' | 'failed' | 'waiting';
  current_node_id: string | null; resume_at: string | null;
  created_at: string; updated_at: string;
}
export type FlowExecutionLog = {
  id: string; execution_id: string; node_id: string; node_type: string;
  status: string; output: string | null; created_at: string;
}

// ─── ASP types ───────────────────────────────────────────────────────────────

export type AspCampaign = {
  id: string; name: string; description: string | null;
  commission_rate: number; is_active: number;
  start_date: string | null; end_date: string | null;
  created_at: string; updated_at: string;
}
export type AspReward = {
  id: string; affiliate_id: string; campaign_id: string | null;
  period: string; conversions: number; amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  note: string | null; created_at: string; updated_at: string;
  affiliate_name: string; campaign_name: string | null;
}
export type AspFraudLog = {
  id: string; affiliate_id: string | null; ip_address: string | null;
  reason: string; severity: 'low' | 'medium' | 'high';
  resolved: number; created_at: string;
  affiliate_name: string | null;
}
