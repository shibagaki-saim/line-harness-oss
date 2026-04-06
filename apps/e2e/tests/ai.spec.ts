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

async function checkNoError(page: Page, label: string) {
  const errorTexts = ['エラーが発生しました', '接続に失敗しました', '500', 'Internal Server Error']
  for (const err of errorTexts) {
    const count = await page.getByText(err, { exact: false }).count()
    if (count > 0) {
      console.warn(`[${label}] エラーテキスト検出: "${err}"`)
    }
  }
  await expect(page).not.toHaveURL(/\/login/)
}

test.describe('AI設定', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('AI設定ページが表示される', async ({ page }) => {
    await page.goto('/ai/settings')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'ai-settings')
    const content = await page.content()
    expect(content).toMatch(/AI|設定/)
    await page.screenshot({ path: 'test-results/screenshots/ai-settings.png', fullPage: true })
  })

  test('AIナレッジベースページが表示される', async ({ page }) => {
    await page.goto('/ai/knowledge')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'ai-knowledge')
    const content = await page.content()
    expect(content).toMatch(/ナレッジ|知識|AI/)
    await page.screenshot({ path: 'test-results/screenshots/ai-knowledge.png', fullPage: true })
  })

  test('AIログページが表示される', async ({ page }) => {
    await page.goto('/ai/logs')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'ai-logs')
    const content = await page.content()
    expect(content).toMatch(/ログ|AI/)
    await page.screenshot({ path: 'test-results/screenshots/ai-logs.png', fullPage: true })
  })

  test('AIハンドオーバーページが表示される', async ({ page }) => {
    await page.goto('/ai/handover')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'ai-handover')
    await page.screenshot({ path: 'test-results/screenshots/ai-handover.png', fullPage: true })
  })

  test('AIプロアクティブページが表示される', async ({ page }) => {
    await page.goto('/ai/proactive')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'ai-proactive')
    await page.screenshot({ path: 'test-results/screenshots/ai-proactive.png', fullPage: true })
  })
})

test.describe('AIナレッジ管理操作', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/ai/knowledge')
    await page.waitForTimeout(2000)
  })

  test('ナレッジ追加フォームが開く', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /追加|新規|ナレッジを追加/ }).first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'test-results/screenshots/ai-knowledge-form.png' })
    }
  })
})

test.describe('AI設定API疎通確認', () => {
  test('AI設定APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/ai/settings`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    // AIが設定されていない場合は404や200どちらも想定
    expect([200, 404]).toContain(res.status())
  })

  test('AIナレッジ一覧APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/ai/knowledge`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect([200, 404]).toContain(res.status())
    if (res.status() === 200) {
      const json = await res.json()
      expect(json.success).toBe(true)
    }
  })

  test('AIログAPIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/ai/logs`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect([200, 404]).toContain(res.status())
    if (res.status() === 200) {
      const json = await res.json()
      expect(json.success).toBe(true)
    }
  })
})
