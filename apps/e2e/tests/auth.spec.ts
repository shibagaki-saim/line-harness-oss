import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@line-harness.local'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'LH-Admin-2026!'
const WRONG_PASSWORD = 'wrongpassword123'

test.describe('メール+パスワードログイン', () => {
  test.beforeEach(async ({ page }) => {
    // テスト前にlocalStorageをクリア（未ログイン状態を保証）
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('正しい認証情報でログインできる', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('admin@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('パスワードを入力').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'ログイン' }).click()

    // ダッシュボード（/）にリダイレクトされることを確認
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })

    // lh_session_token がlocalStorageに保存されていることを確認
    const token = await page.evaluate(() => localStorage.getItem('lh_session_token'))
    expect(token).toBeTruthy()
    expect(token).not.toBe('')

    await page.screenshot({ path: 'test-results/screenshots/auth_login_success.png' })
  })

  test('未入力ではログインボタンが無効', async ({ page }) => {
    await page.goto('/login')

    const button = page.getByRole('button', { name: 'ログイン' })
    await expect(button).toBeDisabled()

    // メールのみ入力
    await page.getByPlaceholder('admin@example.com').fill(TEST_EMAIL)
    await expect(button).toBeDisabled()

    // パスワードも入力 → 有効化
    await page.getByPlaceholder('パスワードを入力').fill(TEST_PASSWORD)
    await expect(button).toBeEnabled()
  })

  test('間違ったパスワードではエラーが表示される', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('admin@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('パスワードを入力').fill(WRONG_PASSWORD)
    await page.getByRole('button', { name: 'ログイン' }).click()

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('メールアドレスまたはパスワードが違います')).toBeVisible({ timeout: 10000 })

    // ログインページに留まることを確認
    await expect(page).toHaveURL(/\/login/)

    // セッショントークンが保存されていないことを確認
    const token = await page.evaluate(() => localStorage.getItem('lh_session_token'))
    expect(token).toBeNull()

    await page.screenshot({ path: 'test-results/screenshots/auth_login_error.png' })
  })

  test('ログアウトするとログイン画面に戻る', async ({ page }) => {
    // まずログイン
    await page.goto('/login')
    await page.getByPlaceholder('admin@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('パスワードを入力').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })

    // サイドバーのログアウトボタンをクリック（2つある場合は最後の可視ボタン）
    await page.getByText('ログアウト').last().click()

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    // セッショントークンが削除されていることを確認
    const token = await page.evaluate(() => localStorage.getItem('lh_session_token'))
    expect(token).toBeNull()

    await page.screenshot({ path: 'test-results/screenshots/auth_logout.png' })
  })

  test('未ログイン状態でダッシュボードにアクセスするとログイン画面にリダイレクトされる', async ({ page }) => {
    // localStorageを空にして直接ダッシュボードへ
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/friends')

    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    await page.screenshot({ path: 'test-results/screenshots/auth_redirect_to_login.png' })
  })
})
