import { test, expect, Page } from '@playwright/test'

const API_KEY = process.env.API_KEY || 'cb5a34aeee932f0b97998b8307115b7232d22947c2c906182ec3497d8582ac5c'
const API_URL = process.env.API_URL || 'https://line-harness.shibagaki.workers.dev'

async function setupAuth(page: Page) {
  await page.goto('/')
  await page.evaluate((key) => {
    localStorage.setItem('lh_session_token', key)
    localStorage.setItem('lh_staff_name', 'E2Eテスト')
    localStorage.setItem('lh_staff_role', 'owner')
  }, API_KEY)
}

// テスト用下書き配信を作成して ID を返す
async function createDraftBroadcast(title: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/broadcasts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      title,
      messageType: 'text',
      messageContent: `${title} のテストメッセージ`,
      targetType: 'all',
    }),
  })
  const data = await res.json() as { success: boolean; data: { id: string } }
  if (!data.success) throw new Error('テスト用配信の作成に失敗')
  return data.data.id
}

// テスト用配信を削除
async function deleteBroadcast(id: string): Promise<void> {
  await fetch(`${API_URL}/api/broadcasts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
}

test.describe('Phase 6: 配信セーフガード', () => {
  let broadcastId: string

  test.beforeAll(async () => {
    broadcastId = await createDraftBroadcast('E2Eテスト配信【Phase6】')
  })

  test.afterAll(async () => {
    await deleteBroadcast(broadcastId)
  })

  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/broadcasts')
    await page.waitForTimeout(1500)
  })

  test('配信一覧が表示される', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: '一斉配信' })).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/broadcasts_list.png' })
  })

  test('「今すぐ送信」ボタンクリックで確認モーダルが表示される', async ({ page }) => {
    // 下書き配信の「今すぐ送信」ボタンをクリック
    const sendBtn = page.getByRole('button', { name: '今すぐ送信' }).first()
    await expect(sendBtn).toBeVisible({ timeout: 5000 })
    await sendBtn.click()

    // 確認モーダルが表示されることを確認
    await expect(page.getByText('送信内容の確認')).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'test-results/screenshots/broadcasts_confirm_modal.png' })
  })

  test('確認モーダルに対象件数・タイトル・タイプが表示される', async ({ page }) => {
    const sendBtn = page.getByRole('button', { name: '今すぐ送信' }).first()
    await expect(sendBtn).toBeVisible({ timeout: 5000 })
    await sendBtn.click()

    // モーダルのコンテンツを確認
    await expect(page.getByText('送信内容の確認')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('件に送信されます')).toBeVisible()
    await expect(page.getByText('タイトル', { exact: true })).toBeVisible()
    await expect(page.getByText('タイプ', { exact: true })).toBeVisible()
  })

  test('確認モーダルの「キャンセル」で送信されない', async ({ page }) => {
    const sendBtn = page.getByRole('button', { name: '今すぐ送信' }).first()
    await expect(sendBtn).toBeVisible({ timeout: 5000 })
    await sendBtn.click()

    await expect(page.getByText('送信内容の確認')).toBeVisible({ timeout: 5000 })

    // キャンセルをクリック
    await page.getByRole('button', { name: 'キャンセル' }).click()

    // モーダルが閉じることを確認
    await expect(page.getByText('送信内容の確認')).not.toBeVisible()

    // 配信ステータスが変わっていないこと（まだ下書き）
    await expect(page.getByText('下書き').first()).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/broadcasts_cancel.png' })
  })
})

test.describe('Phase 7: 配信レポート', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/broadcasts')
    await page.waitForTimeout(1500)
  })

  test('送信済み配信に「レポート」ボタンが表示される（送信済みがある場合）', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)

    // 送信済み配信が存在する場合のみ確認
    const sentBadge = page.getByText('送信完了').first()
    const hasSent = await sentBadge.count()

    if (hasSent > 0) {
      await expect(page.getByRole('button', { name: 'レポート' }).first()).toBeVisible()
      await page.screenshot({ path: 'test-results/screenshots/broadcasts_report_btn.png' })
    } else {
      // 送信済みがない場合はスキップ（ログだけ出す）
      console.log('送信済み配信なし - レポートボタンテストをスキップ')
    }
  })

  test('レポートAPIが正常に応答する', async () => {
    // まず既存配信一覧を取得
    const listRes = await fetch(`${API_URL}/api/broadcasts`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const listData = await listRes.json() as { success: boolean; data: Array<{ id: string; status: string }> }
    expect(listData.success).toBe(true)

    // 任意の配信に対してレポートAPIを呼ぶ
    if (listData.data.length > 0) {
      const id = listData.data[0].id
      const reportRes = await fetch(`${API_URL}/api/broadcasts/${id}/report`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      })
      const reportData = await reportRes.json() as {
        success: boolean
        data: { broadcastId: string; totalCount: number; clickCount: number; ctr: number | null; clicks: unknown[] }
      }
      expect(reportData.success).toBe(true)
      expect(reportData.data).toHaveProperty('broadcastId')
      expect(reportData.data).toHaveProperty('totalCount')
      expect(reportData.data).toHaveProperty('clickCount')
      expect(reportData.data).toHaveProperty('ctr')
      expect(Array.isArray(reportData.data.clicks)).toBe(true)
    }
  })

  test('プレビューAPIが正常に応答する', async () => {
    // テスト用配信を作成
    const id = await createDraftBroadcast('E2Eテスト配信【preview API】')

    try {
      const res = await fetch(`${API_URL}/api/broadcasts/${id}/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}` },
      })
      const data = await res.json() as {
        success: boolean
        data: { recipientCount: number; title: string; messageType: string }
      }
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('recipientCount')
      expect(typeof data.data.recipientCount).toBe('number')
      expect(data.data.title).toBe('E2Eテスト配信【preview API】')
      expect(data.data.messageType).toBe('text')
    } finally {
      await deleteBroadcast(id)
    }
  })
})
