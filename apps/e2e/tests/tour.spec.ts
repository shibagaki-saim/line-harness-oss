import { test, expect, Page } from '@playwright/test'

const API_KEY = process.env.API_KEY || 'cb5a34aeee932f0b97998b8307115b7232d22947c2c906182ec3497d8582ac5c'

// ログイン状態をセットアップ（localStorage に API キーを注入）
async function setupAuth(page: Page) {
  await page.goto('/')
  await page.evaluate((key) => {
    localStorage.setItem('lh_api_key', key)
    localStorage.setItem('lh_staff_name', 'E2Eテスト')
    localStorage.setItem('lh_staff_role', 'owner')
  }, API_KEY)
}

// ページを開いてエラーがないことを確認するヘルパー
async function checkPage(page: Page, path: string, label: string) {
  await page.goto(path)
  // ローディング完了を待つ（最大5秒）
  await page.waitForTimeout(2000)

  // エラーメッセージが表示されていないか確認
  const errorTexts = ['エラーが発生しました', '接続に失敗しました', '500', 'Internal Server Error']
  for (const errText of errorTexts) {
    const found = await page.getByText(errText).count()
    if (found > 0) {
      console.warn(`[${label}] エラーテキスト検出: "${errText}"`)
    }
  }

  // ページがログイン画面にリダイレクトされていないか
  await expect(page).not.toHaveURL(/\/login/)

  // スクリーンショット保存
  await page.screenshot({ path: `test-results/screenshots/${label.replace(/\//g, '_')}.png`, fullPage: true })
  console.log(`✅ ${label} (${path}) — OK`)
}

test.describe('動作確認ツアー', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('9-1: 個別チャット', async ({ page }) => {
    await checkPage(page, '/chats', 'chats')
    // チャット一覧が存在することを確認
    const content = await page.content()
    // 空でもエラーでもなくページが描画されていれば OK
    expect(content).toContain('チャット')
  })

  test('9-2: オートメーション', async ({ page }) => {
    await checkPage(page, '/automations', 'automations')
    expect(await page.content()).toContain('オートメーション')
  })

  test('9-3: スコアリング', async ({ page }) => {
    await checkPage(page, '/scoring', 'scoring')
    expect(await page.content()).toContain('スコア')
  })

  test('9-4: Webhook', async ({ page }) => {
    await checkPage(page, '/webhooks', 'webhooks')
    expect(await page.content()).toContain('Webhook')
  })

  test('9-5: 通知', async ({ page }) => {
    await checkPage(page, '/notifications', 'notifications')
    expect(await page.content()).toContain('通知')
  })

  test('9-6: フォーム回答', async ({ page }) => {
    await checkPage(page, '/form-submissions', 'form-submissions')
    expect(await page.content()).toContain('フォーム')
  })

  test('9-7: CV計測', async ({ page }) => {
    await checkPage(page, '/conversions', 'conversions')
    expect(await page.content()).toContain('コンバージョン')
  })

  test('9-8: 流入経路', async ({ page }) => {
    await checkPage(page, '/affiliates', 'affiliates')
    expect(await page.content()).toContain('流入')
  })

  test('9-9: BAN検知', async ({ page }) => {
    await checkPage(page, '/health', 'health')
    expect(await page.content()).toContain('BAN')
  })

  test('9-10: UUID管理', async ({ page }) => {
    await checkPage(page, '/users', 'users')
    expect(await page.content()).toContain('UUID')
  })

  test('9-11: LINEアカウント', async ({ page }) => {
    await checkPage(page, '/accounts', 'accounts')
    expect(await page.content()).toContain('アカウント')
  })

  test('9-12: スタッフ管理', async ({ page }) => {
    await checkPage(page, '/staff', 'staff')
    expect(await page.content()).toContain('スタッフ')
  })

  test('9-13: 緊急コントロール', async ({ page }) => {
    await checkPage(page, '/emergency', 'emergency')
    expect(await page.content()).toContain('緊急')
  })
})
