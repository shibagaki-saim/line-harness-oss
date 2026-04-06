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

test.describe('フロー管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/flows')
    await page.waitForTimeout(2000)
  })

  test('フロー一覧ページが表示される', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    const content = await page.content()
    expect(content).toContain('フロー')
    await page.screenshot({ path: 'test-results/screenshots/flows-list.png', fullPage: true })
  })

  test('フローを作成できる', async ({ page }) => {
    // フロー名入力フィールドを探す
    const nameInput = page.locator('input[type="text"]').first()
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2Eテストフロー')
      // 作成ボタンを探す
      const createBtn = page.getByRole('button', { name: /作成|追加|保存/ }).first()
      if (await createBtn.isVisible()) {
        await createBtn.click()
        await page.waitForTimeout(2000)
        await expect(page.getByText('E2Eテストフロー').first()).toBeVisible()
        await page.screenshot({ path: 'test-results/screenshots/flows-created.png' })
      }
    }
  })

  test('フロー有効/無効を切り替えられる', async ({ page }) => {
    const toggleBtn = page.getByRole('button', { name: /有効にする|無効にする|ON|OFF/ }).first()
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click()
      await page.waitForTimeout(1500)
      await expect(page).not.toHaveURL(/\/login/)
      await page.screenshot({ path: 'test-results/screenshots/flows-toggled.png' })
    }
  })

  test('フローエディタページに遷移できる', async ({ page }) => {
    const editLink = page.getByRole('link', { name: /編集|エディタ|フロー名/ }).first()
    if (await editLink.isVisible()) {
      await editLink.click()
      await page.waitForTimeout(2000)
      await expect(page).not.toHaveURL(/\/login/)
      await page.screenshot({ path: 'test-results/screenshots/flows-editor.png', fullPage: true })
    } else {
      // 直接エディタURLに遷移
      await page.goto('/flows/editor')
      await page.waitForTimeout(2000)
      await expect(page).not.toHaveURL(/\/login/)
      await page.screenshot({ path: 'test-results/screenshots/flows-editor.png', fullPage: true })
    }
  })
})

test.describe('フローAPI疎通確認', () => {
  test('フロー一覧APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/flows`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('フローCRUDが動作する', async ({ page }) => {
    await setupAuth(page)

    // 作成
    const createRes = await page.request.post(`${API_BASE}/api/flows`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E-APIフロー', trigger_type: 'manual' },
    })
    expect(createRes.status()).toBe(201)
    const { data: flow } = await createRes.json()
    expect(flow.name).toBe('E2E-APIフロー')

    // 有効化
    const updateRes = await page.request.put(`${API_BASE}/api/flows/${flow.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: { is_active: 1 },
    })
    expect(updateRes.status()).toBe(200)

    // 削除
    const deleteRes = await page.request.delete(`${API_BASE}/api/flows/${flow.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(deleteRes.status()).toBe(200)
  })
})
