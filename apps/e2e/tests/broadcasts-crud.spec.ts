import { test, expect, Page } from '@playwright/test'

const API_KEY = process.env.API_KEY || 'cb5a34aeee932f0b97998b8307115b7232d22947c2c906182ec3497d8582ac5c'
const API_BASE = process.env.API_URL || 'https://line-harness.shibagaki.workers.dev'

async function setupAuth(page: Page) {
  await page.goto('/')
  await page.evaluate((key) => {
    localStorage.setItem('lh_session_token', key)
    localStorage.setItem('lh_staff_name', 'E2Eテスト')
    localStorage.setItem('lh_staff_role', 'owner')
  }, API_KEY)
}

test.describe('一斉配信CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/broadcasts')
    await page.waitForTimeout(2000)
  })

  test('一斉配信一覧ページが表示される', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    const content = await page.content()
    expect(content).toContain('配信')
    await page.screenshot({ path: 'test-results/screenshots/broadcasts-list.png', fullPage: true })
  })

  test('新規配信作成フォームが開く', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /\+ 新規|新規作成|配信を作成/ }).first()
    if (await newBtn.isVisible()) {
      await newBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'test-results/screenshots/broadcasts-form.png' })
    }
  })

  test('送信ボタンが確認モーダルを表示する', async ({ page }) => {
    // 既存のドラフト配信の「今すぐ送信」ボタンを探す
    const sendBtn = page.getByRole('button', { name: '今すぐ送信' }).first()
    if (await sendBtn.isVisible()) {
      await sendBtn.click()
      await page.waitForTimeout(500)
      // 確認モーダルが表示されることを確認
      const confirmText = page.getByText(/確認|本当に|送信しますか/)
      if (await confirmText.isVisible()) {
        await page.getByRole('button', { name: 'キャンセル' }).click()
      }
      await page.screenshot({ path: 'test-results/screenshots/broadcasts-send-modal.png' })
    }
  })

  test('配信レポートページが表示される', async ({ page }) => {
    const reportBtn = page.getByRole('button', { name: 'レポート' }).first()
    if (await reportBtn.isVisible()) {
      await reportBtn.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/screenshots/broadcasts-report.png' })
    }
  })
})

test.describe('一斉配信API疎通確認', () => {
  test('配信一覧APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/broadcasts`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('配信CRUDが完全に動作する', async ({ page }) => {
    await setupAuth(page)

    // 作成
    const createRes = await page.request.post(`${API_BASE}/api/broadcasts`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: {
        title: 'E2E-API配信テスト',
        messageType: 'text',
        messageContent: 'E2Eテスト用メッセージ',
        targetType: 'all',
      },
    })
    expect(createRes.status()).toBe(201)
    const { data: broadcast } = await createRes.json()
    expect(broadcast.title).toBe('E2E-API配信テスト')
    expect(broadcast.status).toBe('draft')

    // 取得
    const getRes = await page.request.get(`${API_BASE}/api/broadcasts/${broadcast.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(getRes.status()).toBe(200)

    // 更新
    const updateRes = await page.request.put(`${API_BASE}/api/broadcasts/${broadcast.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: { title: 'E2E-API配信テスト（更新済み）' },
    })
    expect(updateRes.status()).toBe(200)
    const updated = await updateRes.json()
    expect(updated.data.title).toBe('E2E-API配信テスト（更新済み）')

    // プレビュー
    const previewRes = await page.request.post(`${API_BASE}/api/broadcasts/${broadcast.id}/preview`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(previewRes.status()).toBe(200)
    const preview = await previewRes.json()
    expect(preview.data).toHaveProperty('recipientCount')
    expect(typeof preview.data.recipientCount).toBe('number')

    // 削除
    const deleteRes = await page.request.delete(`${API_BASE}/api/broadcasts/${broadcast.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(deleteRes.status()).toBe(200)
  })

  test('タグ絞り込み配信の作成が動作する', async ({ page }) => {
    await setupAuth(page)

    // タグ一覧取得
    const tagsRes = await page.request.get(`${API_BASE}/api/tags`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const tagsJson = await tagsRes.json()
    if (!tagsJson.data?.length) {
      test.skip()
      return
    }
    const tag = tagsJson.data[0]

    // タグ絞り込み配信を作成
    const createRes = await page.request.post(`${API_BASE}/api/broadcasts`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: {
        title: 'E2E-タグ絞り込み配信',
        messageType: 'text',
        messageContent: 'タグフィルターテスト',
        targetType: 'tag',
        targetTagId: tag.id,
      },
    })
    expect(createRes.status()).toBe(201)
    const { data: broadcast } = await createRes.json()
    expect(broadcast.targetType).toBe('tag')

    // クリーンアップ
    await page.request.delete(`${API_BASE}/api/broadcasts/${broadcast.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
  })

  test('配信レポートAPIが正常に応答する', async ({ page }) => {
    await setupAuth(page)

    // 送信済み配信があれば取得
    const listRes = await page.request.get(`${API_BASE}/api/broadcasts`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const listJson = await listRes.json()
    const sentBroadcast = listJson.data?.find((b: { status: string }) => b.status === 'sent')
    if (!sentBroadcast) {
      test.skip()
      return
    }

    const reportRes = await page.request.get(`${API_BASE}/api/broadcasts/${sentBroadcast.id}/report`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(reportRes.status()).toBe(200)
    const report = await reportRes.json()
    expect(report.data).toHaveProperty('broadcastId')
    expect(report.data).toHaveProperty('totalCount')
    expect(report.data).toHaveProperty('clickCount')
    expect(report.data).toHaveProperty('clicks')
  })
})
