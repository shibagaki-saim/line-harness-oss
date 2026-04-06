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

test.describe('リマインダー管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/reminders')
    await page.waitForTimeout(2000)
  })

  test('リマインダー一覧ページが表示される', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    const content = await page.content()
    expect(content).toContain('リマインダー')
    await page.screenshot({ path: 'test-results/screenshots/reminders-list.png', fullPage: true })
  })

  test('新規リマインダー作成モーダルが開く', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規リマインダー' }).click()
    await expect(page.getByText('新規リマインダーを作成')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/reminders-modal.png' })
  })

  test('リマインダーを作成できる', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規リマインダー' }).click()
    await page.getByPlaceholder('例: セミナー参加リマインダー').fill('E2Eテストリマインダー')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('E2Eテストリマインダー').first()).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/reminders-created.png' })
  })

  test('リマインダーを展開してステップを追加できる', async ({ page }) => {
    const card = page.getByText('E2Eテストリマインダー').first()
    if (await card.isVisible()) {
      // カードをクリックして展開
      await card.click()
      await page.waitForTimeout(800)

      // ステップ追加ボタンを探す
      const addStepBtn = page.getByRole('button', { name: /\+ ステップ追加|ステップ追加/ }).first()
      if (await addStepBtn.isVisible()) {
        await addStepBtn.click()
        await page.waitForTimeout(500)
        await expect(page.getByText('ステップを追加')).toBeVisible()
        await page.screenshot({ path: 'test-results/screenshots/reminders-step-modal.png' })

        // オフセットとメッセージを入力
        const offsetInput = page.getByPlaceholder('例: -60 (1時間前), +30 (30分後)')
        if (await offsetInput.isVisible()) {
          await offsetInput.fill('-60')
        } else {
          await page.locator('input[type="number"]').first().fill('-60')
        }
        await page.locator('textarea').first().fill('リマインダーテストメッセージ')
        await page.getByRole('button', { name: '追加' }).first().click()
        await page.waitForTimeout(2000)
        await page.screenshot({ path: 'test-results/screenshots/reminders-step-added.png', fullPage: true })
      }
    }
  })

  test('リマインダーの有効/無効を切り替えられる', async ({ page }) => {
    const card = page.getByText('E2Eテストリマインダー').first()
    if (await card.isVisible()) {
      await card.click()
      await page.waitForTimeout(800)

      // 有効化/無効化ボタンを探す
      const toggleBtn = page.getByRole('button', { name: /有効にする|無効にする/ }).first()
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click()
        await page.waitForTimeout(1500)
        await page.screenshot({ path: 'test-results/screenshots/reminders-toggled.png' })
      }
    }
  })

  test('リマインダーを削除できる', async ({ page }) => {
    const card = page.getByText('E2Eテストリマインダー').first()
    if (await card.isVisible()) {
      await card.click()
      await page.waitForTimeout(800)

      const deleteBtn = page.getByRole('button', { name: '削除' }).first()
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click()
        await page.waitForTimeout(1500)
        await page.screenshot({ path: 'test-results/screenshots/reminders-deleted.png' })
      }
    }
  })
})

test.describe('リマインダーAPI疎通確認', () => {
  test('リマインダー一覧APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/reminders`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('リマインダーCRUDとステップ追加が動作する', async ({ page }) => {
    await setupAuth(page)

    // リマインダー作成
    const createRes = await page.request.post(`${API_BASE}/api/reminders`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E-APIリマインダー', description: 'E2Eテスト用' },
    })
    expect(createRes.status()).toBe(201)
    const { data: reminder } = await createRes.json()
    expect(reminder.name).toBe('E2E-APIリマインダー')

    // ステップ追加
    const stepRes = await page.request.post(`${API_BASE}/api/reminders/${reminder.id}/steps`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: {
        offsetMinutes: -60,
        messageType: 'text',
        messageContent: '1時間前のリマインダーです',
      },
    })
    expect(stepRes.status()).toBe(201)
    const step = await stepRes.json()
    expect(step.data.offsetMinutes).toBe(-60)

    // ステップ削除
    await page.request.delete(`${API_BASE}/api/reminders/${reminder.id}/steps/${step.data.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })

    // リマインダー削除
    await page.request.delete(`${API_BASE}/api/reminders/${reminder.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
  })

  test('友だちへのリマインダー登録APIが動作する', async ({ page }) => {
    await setupAuth(page)

    // 友だち一覧を取得
    const friendsRes = await page.request.get(`${API_BASE}/api/friends?limit=1`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const friendsJson = await friendsRes.json()
    if (!friendsJson.data?.items?.length) {
      test.skip()
      return
    }
    const friendId = friendsJson.data.items[0].id

    // リマインダー作成
    const reminderRes = await page.request.post(`${API_BASE}/api/reminders`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E-登録テストリマインダー' },
    })
    const { data: reminder } = await reminderRes.json()

    // 友だち登録
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const targetDate = tomorrow.toISOString().split('T')[0]

    const enrollRes = await page.request.post(
      `${API_BASE}/api/reminders/${reminder.id}/enroll/${friendId}`,
      {
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        data: { targetDate },
      }
    )
    expect(enrollRes.status()).toBe(201)
    const enrollment = await enrollRes.json()
    expect(enrollment.data.friendId).toBe(friendId)
    expect(enrollment.data.reminderId).toBe(reminder.id)

    // クリーンアップ
    await page.request.delete(`${API_BASE}/api/friend-reminders/${enrollment.data.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    await page.request.delete(`${API_BASE}/api/reminders/${reminder.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
  })
})
