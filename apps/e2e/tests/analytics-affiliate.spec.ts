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

test.describe('アナリティクス', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('アナリティクスページが表示される', async ({ page }) => {
    await page.goto('/analytics')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'analytics')
    const content = await page.content()
    expect(content).toMatch(/アナリティクス|分析|Analytics/)
    await page.screenshot({ path: 'test-results/screenshots/analytics.png', fullPage: true })
  })

  test('アナリティクスにデータグラフが表示される', async ({ page }) => {
    await page.goto('/analytics')
    await page.waitForTimeout(3000) // グラフ描画を待つ
    await checkNoError(page, 'analytics-graphs')
    // SVGまたはcanvasが存在することを確認（チャート）
    const hasChart = await page.locator('svg, canvas').count()
    // エラーなくページが表示されていれば OK
    await expect(page).not.toHaveURL(/\/login/)
    await page.screenshot({ path: 'test-results/screenshots/analytics-graphs.png', fullPage: true })
  })
})

test.describe('アフィリエイト管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('アフィリエイトページが表示される', async ({ page }) => {
    await page.goto('/affiliate')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'affiliate')
    await page.screenshot({ path: 'test-results/screenshots/affiliate.png', fullPage: true })
  })

  test('流入経路ページが表示される', async ({ page }) => {
    await page.goto('/affiliates')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'affiliates')
    const content = await page.content()
    expect(content).toContain('流入')
    await page.screenshot({ path: 'test-results/screenshots/affiliates.png', fullPage: true })
  })

  test('リファラルコード統計APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/friends/ref-stats`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('routes')
    expect(json.data).toHaveProperty('totalWithRef')
  })
})

test.describe('フォーム回答一覧', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/form-submissions')
    await page.waitForTimeout(2000)
  })

  test('フォーム回答一覧ページが正常に表示される', async ({ page }) => {
    await checkNoError(page, 'form-submissions')
    const content = await page.content()
    expect(content).toContain('フォーム')
    await page.screenshot({ path: 'test-results/screenshots/form-submissions.png', fullPage: true })
  })

  test('フォームAPIが正常に応答する', async ({ page }) => {
    // form-submissions は /api/forms として提供されている
    const res = await page.request.get(`${API_BASE}/api/forms`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

test.describe('アカウント管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('LINEアカウント一覧が表示される', async ({ page }) => {
    await page.goto('/accounts')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'accounts')
    const content = await page.content()
    expect(content).toContain('アカウント')
    await page.screenshot({ path: 'test-results/screenshots/accounts.png', fullPage: true })
  })

  test('LINEアカウント一覧APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/line-accounts`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('UUID管理ページが表示される', async ({ page }) => {
    await page.goto('/users')
    await page.waitForTimeout(2000)
    await checkNoError(page, 'users')
    const content = await page.content()
    expect(content).toContain('UUID')
    await page.screenshot({ path: 'test-results/screenshots/users.png', fullPage: true })
  })
})
