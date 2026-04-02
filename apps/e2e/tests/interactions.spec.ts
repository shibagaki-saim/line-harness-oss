import { test, expect, Page } from '@playwright/test'

const API_KEY = process.env.API_KEY || 'cb5a34aeee932f0b97998b8307115b7232d22947c2c906182ec3497d8582ac5c'

async function setupAuth(page: Page) {
  await page.goto('/')
  await page.evaluate((key) => {
    localStorage.setItem('lh_api_key', key)
    localStorage.setItem('lh_staff_name', 'E2Eテスト')
    localStorage.setItem('lh_staff_role', 'owner')
  }, API_KEY)
}

test.describe('9-2: オートメーション', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/automations')
    await page.waitForTimeout(1500)
  })

  test('新規ルールボタンでモーダルが開く', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規ルール' }).click()
    await expect(page.getByText('新規オートメーションを作成')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/automations-modal.png' })
  })

  test('ルールを作成して保存できる', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規ルール' }).click()
    await page.getByPlaceholder('例: 友だち追加時にウェルカムタグ付与').fill('E2Eテストルール')
    await page.locator('select').first().selectOption({ index: 1 })
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('E2Eテストルール')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/automations-created.png' })
  })
})

test.describe('9-3: スコアリング', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/scoring')
    await page.waitForTimeout(1500)
  })

  test('新規ルールボタンでモーダルが開く', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規ルール' }).click()
    await expect(page.getByText('新規スコアリングルールを作成')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/scoring-modal.png' })
  })

  test('スコアリングルールを作成できる', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規ルール' }).click()
    await page.getByPlaceholder('例: メッセージ開封').fill('E2Eスコアルール')
    await page.getByPlaceholder('例: message_open, url_click, friend_add').fill('friend_add')
    await page.getByPlaceholder('例: 10 (正の値で加算、負の値で減算)').fill('10')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('E2Eスコアルール')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/scoring-created.png' })
  })
})

test.describe('9-4: Webhook', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/webhooks')
    await page.waitForTimeout(1500)
  })

  test('受信Webhookを作成できる', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規Webhook' }).click()
    await expect(page.getByText('受信Webhook作成')).toBeVisible()
    await page.getByPlaceholder('LINE公式アカウント').fill('E2Eテスト受信Webhook')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('E2Eテスト受信Webhook')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/webhooks-in-created.png' })
  })

  test('送信Webhookを作成できる', async ({ page }) => {
    await page.getByText('送信 (Outgoing)').click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: '+ 新規Webhook' }).click()
    await expect(page.getByText('送信Webhook作成')).toBeVisible()
    await page.getByPlaceholder('外部CRM連携').fill('E2Eテスト送信Webhook')
    await page.getByPlaceholder('https://example.com/webhook').fill('https://example.com/webhook')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('E2Eテスト送信Webhook')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/webhooks-out-created.png' })
  })
})

test.describe('9-5: 通知', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/notifications')
    await page.waitForTimeout(1500)
  })

  test('新規ルールボタンでモーダルが開く', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規ルール' }).click()
    await expect(page.getByText('新規ルールを作成')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/notifications-modal.png' })
  })

  test('通知ルールを作成できる', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規ルール' }).click()
    await page.getByPlaceholder('例: 新規友だち追加通知').fill('E2Eテスト通知ルール')
    await page.getByPlaceholder('例: friend_add, message_received, tag_added').fill('friend_add')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('E2Eテスト通知ルール')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/notifications-created.png' })
  })
})

test.describe('9-7: CV計測', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/conversions')
    await page.waitForTimeout(1500)
  })

  test('CVポイント作成フォームが開く', async ({ page }) => {
    await page.getByRole('button', { name: '+ CVポイント作成' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByPlaceholder('購入完了')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/conversions-form.png' })
  })

  test('CVポイントを作成できる', async ({ page }) => {
    await page.getByRole('button', { name: '+ CVポイント作成' }).click()
    await page.getByPlaceholder('購入完了').fill('E2EテストCV')
    await page.locator('select').first().selectOption({ index: 1 })
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByRole('cell', { name: 'E2EテストCV' })).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/conversions-created.png' })
  })
})

test.describe('9-12: スタッフ管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/staff')
    await page.waitForTimeout(1500)
  })

  test('スタッフ追加モーダルが開く', async ({ page }) => {
    await page.getByRole('button', { name: '+ スタッフを追加' }).click()
    await expect(page.getByText('新しいスタッフを追加')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/staff-modal.png' })
  })

  test('スタッフを作成できる', async ({ page }) => {
    await page.getByRole('button', { name: '+ スタッフを追加' }).click()
    await page.getByPlaceholder('田中 太郎').fill('E2Eテストスタッフ')
    await page.getByPlaceholder('taro@example.com').fill('e2e@example.com')
    await page.locator('select').selectOption('staff')
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('E2Eテストスタッフ')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/staff-created.png' })
  })
})

test.describe('9-13: 緊急コントロール', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/emergency')
    await page.waitForTimeout(1500)
  })

  test('確認ダイアログが表示される（実行はしない）', async ({ page }) => {
    await page.getByRole('button', { name: '全配信停止' }).click()
    await expect(page.getByText('本当に実行しますか？')).toBeVisible()
    await page.getByRole('button', { name: 'キャンセル' }).click()
    await page.screenshot({ path: 'test-results/screenshots/emergency-dialog.png' })
  })
})
