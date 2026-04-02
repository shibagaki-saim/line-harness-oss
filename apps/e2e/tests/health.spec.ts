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

test.describe('Phase 8: LINEトークン自動更新', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/health')
    await page.waitForTimeout(2000)
  })

  test('healthページが表示される', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'BAN検知ダッシュボード' })).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/health_page.png' })
  })

  test('LINEアカウントカードが表示される', async ({ page }) => {
    // line_accounts に少なくとも1件登録されていることを前提
    const accountCard = page.locator('.bg-white.rounded-lg.border').first()
    await expect(accountCard).toBeVisible({ timeout: 5000 })
  })

  test('トークン有効期限が表示される', async ({ page }) => {
    await expect(page.getByText('トークン有効期限')).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'test-results/screenshots/health_token_expiry.png' })
  })

  test('「トークン更新」ボタンが表示される', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'トークン更新' }).first()).toBeVisible({ timeout: 5000 })
  })

  test('トークン更新APIが正常に応答する', async () => {
    // line_accounts の最初の1件を取得
    const listRes = await fetch(`${API_URL}/api/line-accounts`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const listData = await listRes.json() as { success: boolean; data: Array<{ id: string; tokenExpiresAt: string | null }> }
    expect(listData.success).toBe(true)

    if (listData.data.length > 0) {
      const accountId = listData.data[0].id

      // 手動更新APIを呼ぶ
      const refreshRes = await fetch(`${API_URL}/api/line-accounts/${accountId}/refresh-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}` },
      })
      const refreshData = await refreshRes.json() as {
        success: boolean
        data: { id: string; tokenExpiresAt: string | null }
      }
      expect(refreshData.success).toBe(true)
      expect(refreshData.data).toHaveProperty('tokenExpiresAt')
      expect(typeof refreshData.data.tokenExpiresAt).toBe('string')
    } else {
      console.log('LINEアカウントなし - トークン更新テストをスキップ')
    }
  })

  test('tokenExpiresAt が line-accounts API レスポンスに含まれる', async () => {
    const res = await fetch(`${API_URL}/api/line-accounts`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const data = await res.json() as { success: boolean; data: Array<{ tokenExpiresAt: string | null }> }
    expect(data.success).toBe(true)
    if (data.data.length > 0) {
      expect(data.data[0]).toHaveProperty('tokenExpiresAt')
    }
  })
})
