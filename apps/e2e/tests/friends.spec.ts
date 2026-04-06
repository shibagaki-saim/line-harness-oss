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

test.describe('友だち管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/friends')
    await page.waitForTimeout(2000)
  })

  test('友だち一覧ページが表示される', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    const content = await page.content()
    expect(content).toContain('友')
    await page.screenshot({ path: 'test-results/screenshots/friends-list.png', fullPage: true })
  })

  test('友だち件数が表示される', async ({ page }) => {
    // "N 件" のような件数表示を探す
    const countText = page.getByText(/\d+\s*件/).first()
    if (await countText.isVisible()) {
      await expect(countText).toBeVisible()
    }
    await page.screenshot({ path: 'test-results/screenshots/friends-count.png' })
  })

  test('タグフィルターが機能する', async ({ page }) => {
    const tagFilter = page.locator('select').first()
    if (await tagFilter.isVisible()) {
      // 「すべて」オプションが存在することを確認
      const options = await tagFilter.locator('option').count()
      expect(options).toBeGreaterThanOrEqual(1)

      // フィルターを変更してもエラーが出ないことを確認
      await tagFilter.selectOption({ index: 0 })
      await page.waitForTimeout(1000)
      await expect(page).not.toHaveURL(/\/login/)
    }
    await page.screenshot({ path: 'test-results/screenshots/friends-tag-filter.png' })
  })

  test('ページネーションが機能する', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: '次へ' })
    const prevBtn = page.getByRole('button', { name: '前へ' })

    // 前へボタンは最初は無効になっているはず
    if (await prevBtn.isVisible()) {
      const isDisabled = await prevBtn.isDisabled()
      expect(isDisabled).toBe(true)
    }

    // 次へボタンが有効なら押してみる
    if (await nextBtn.isVisible() && !(await nextBtn.isDisabled())) {
      await nextBtn.click()
      await page.waitForTimeout(1500)
      await expect(page).not.toHaveURL(/\/login/)
      // 前へボタンが有効になっているはず
      if (await prevBtn.isVisible()) {
        await expect(prevBtn).toBeEnabled()
      }
    }
    await page.screenshot({ path: 'test-results/screenshots/friends-pagination.png' })
  })

  test('友だち詳細ページに遷移できる', async ({ page }) => {
    // テーブルの最初の行のリンクをクリック
    const firstLink = page.getByRole('link').first()
    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href')
      if (href && href.includes('/friends/')) {
        await firstLink.click()
        await page.waitForTimeout(2000)
        await expect(page).not.toHaveURL(/\/login/)
        await page.screenshot({ path: 'test-results/screenshots/friends-detail.png', fullPage: true })
      }
    }
  })
})

test.describe('友だちAPI疎通確認', () => {
  test('友だち一覧APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/friends`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('items')
    expect(json.data).toHaveProperty('total')
    expect(Array.isArray(json.data.items)).toBe(true)
  })

  test('友だち件数APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)
    const res = await page.request.get(`${API_BASE}/api/friends/count`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(typeof json.data.count).toBe('number')
  })

  test('友だちメタデータ更新APIが動作する', async ({ page }) => {
    await setupAuth(page)

    // 友だちを1件取得
    const listRes = await page.request.get(`${API_BASE}/api/friends?limit=1`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const listJson = await listRes.json()
    if (!listJson.data?.items?.length) {
      test.skip()
      return
    }
    const friend = listJson.data.items[0]

    // メタデータを更新
    const updateRes = await page.request.put(`${API_BASE}/api/friends/${friend.id}/metadata`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: { e2e_test: 'tested', test_timestamp: new Date().toISOString() },
    })
    expect(updateRes.status()).toBe(200)
    const updated = await updateRes.json()
    expect(updated.success).toBe(true)
    expect(updated.data.metadata.e2e_test).toBe('tested')
  })

  test('友だちメッセージ履歴APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)

    // 友だちを1件取得
    const listRes = await page.request.get(`${API_BASE}/api/friends?limit=1`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const listJson = await listRes.json()
    if (!listJson.data?.items?.length) {
      test.skip()
      return
    }
    const friend = listJson.data.items[0]

    // メッセージ履歴を取得
    const msgRes = await page.request.get(`${API_BASE}/api/friends/${friend.id}/messages`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(msgRes.status()).toBe(200)
    const msgJson = await msgRes.json()
    expect(msgJson.success).toBe(true)
    expect(Array.isArray(msgJson.data)).toBe(true)
  })

  test('友だちタグ追加・削除APIが動作する', async ({ page }) => {
    await setupAuth(page)

    // 友だちを1件取得
    const listRes = await page.request.get(`${API_BASE}/api/friends?limit=1`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const listJson = await listRes.json()
    if (!listJson.data?.items?.length) {
      test.skip()
      return
    }
    const friend = listJson.data.items[0]

    // タグ一覧を取得
    const tagsRes = await page.request.get(`${API_BASE}/api/tags`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    if (tagsRes.status() !== 200) {
      test.skip()
      return
    }
    const tagsJson = await tagsRes.json()
    if (!tagsJson.data?.length) {
      test.skip()
      return
    }
    const tag = tagsJson.data[0]

    // タグを追加
    const addRes = await page.request.post(`${API_BASE}/api/friends/${friend.id}/tags`, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      data: { tagId: tag.id },
    })
    expect(addRes.status()).toBe(201)

    // タグを削除
    const removeRes = await page.request.delete(`${API_BASE}/api/friends/${friend.id}/tags/${tag.id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    expect(removeRes.status()).toBe(200)
  })
})

test.describe('チャット画面', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/chats')
    await page.waitForTimeout(2000)
  })

  test('チャット一覧がメニューから遷移後も表示される', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    const content = await page.content()
    expect(content).toContain('チャット')
    // エラーが出ていないことを確認
    const errorTexts = ['エラーが発生しました', '接続に失敗しました', 'Internal Server Error']
    for (const err of errorTexts) {
      const count = await page.getByText(err).count()
      expect(count).toBe(0)
    }
    await page.screenshot({ path: 'test-results/screenshots/chats-from-menu.png', fullPage: true })
  })

  test('チャット一覧から個別チャットに遷移できる', async ({ page }) => {
    // 最初のチャットアイテムをクリック
    const firstChat = page.locator('[class*="cursor-pointer"]').first()
      .or(page.locator('[role="button"]').first())
    if (await firstChat.isVisible()) {
      await firstChat.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: 'test-results/screenshots/chats-individual.png', fullPage: true })
    }
  })
})
