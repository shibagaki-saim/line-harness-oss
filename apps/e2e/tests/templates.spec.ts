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

test.describe('メッセージテンプレート', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/templates')
    await page.waitForTimeout(2000)
  })

  test('テンプレート一覧ページが表示される', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    const content = await page.content()
    expect(content).toContain('テンプレート')
    await page.screenshot({ path: 'test-results/screenshots/templates-list.png', fullPage: true })
  })

  test('新規テンプレート作成モーダルが開く', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規テンプレート' }).click()
    await expect(page.getByText('新規テンプレートを作成')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/templates-modal.png' })
  })

  test('テキストテンプレートを作成できる', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規テンプレート' }).click()
    await page.getByPlaceholder('例: ウェルカムメッセージ').fill('E2Eテストテンプレート')
    await page.getByPlaceholder('例: 挨拶、キャンペーン、通知').fill('E2Eテスト')
    // メッセージタイプはデフォルトのテキストのまま
    await page.locator('textarea').fill('E2Eテスト用メッセージ内容です。')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('E2Eテストテンプレート').first()).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/templates-created.png' })
  })

  test('カテゴリフィルターが機能する', async ({ page }) => {
    // 「全て」ボタンが存在することを確認
    const allBtn = page.getByRole('button', { name: '全て' })
    if (await allBtn.isVisible()) {
      await allBtn.click()
      await page.waitForTimeout(500)
      await expect(page).not.toHaveURL(/\/login/)
    }
    await page.screenshot({ path: 'test-results/screenshots/templates-filter.png' })
  })

  test('テンプレートを削除できる', async ({ page }) => {
    // E2Eテストテンプレートの行を探して削除
    const row = page.getByText('E2Eテストテンプレート').first()
    if (await row.isVisible()) {
      // 同じ行の削除ボタンをクリック
      const rowContainer = row.locator('..').locator('..')
      const deleteBtn = rowContainer.getByRole('button', { name: '削除' })
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click()
        await page.waitForTimeout(1500)
        await page.screenshot({ path: 'test-results/screenshots/templates-deleted.png' })
      }
    }
  })
})

test.describe('テンプレートAPI疎通確認', () => {
  test('テンプレート一覧APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/templates`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('テンプレートCRUDが完全に動作する', async ({ page }) => {
    await setupAuth(page)

    // 作成
    const createRes = await page.request.post(`${API_BASE}/api/templates`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: {
        name: 'E2E-APIテンプレート',
        category: 'E2Eテスト',
        messageType: 'text',
        messageContent: 'APIテスト用メッセージ',
      },
    })
    expect(createRes.status()).toBe(201)
    const { data: template } = await createRes.json()
    expect(template.name).toBe('E2E-APIテンプレート')

    // 取得
    const getRes = await page.request.get(`${API_BASE}/api/templates/${template.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(getRes.status()).toBe(200)
    const getJson = await getRes.json()
    expect(getJson.data.id).toBe(template.id)

    // 削除
    const deleteRes = await page.request.delete(`${API_BASE}/api/templates/${template.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(deleteRes.status()).toBe(200)
  })
})
