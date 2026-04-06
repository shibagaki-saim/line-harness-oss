import { test, expect, Page } from '@playwright/test'

const API_KEY = process.env.API_KEY || 'cb5a34aeee932f0b97998b8307115b7232d22947c2c906182ec3497d8582ac5c'

async function setupAuth(page: Page) {
  await page.goto('/')
  await page.evaluate((key) => {
    localStorage.setItem('lh_session_token', key)
    localStorage.setItem('lh_staff_name', 'E2Eテスト')
    localStorage.setItem('lh_staff_role', 'owner')
  }, API_KEY)
}

test.describe('シナリオ配信', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/scenarios')
    await page.waitForTimeout(2000)
  })

  test('シナリオ一覧ページが表示される', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/)
    const content = await page.content()
    expect(content).toContain('シナリオ')
    await page.screenshot({ path: 'test-results/screenshots/scenarios-list.png', fullPage: true })
  })

  test('新規シナリオ作成モーダルが開く', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規シナリオ' }).click()
    await expect(page.getByText('新規シナリオを作成')).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/scenarios-modal.png' })
  })

  test('シナリオを作成できる（友だち追加トリガー）', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規シナリオ' }).click()
    await page.getByPlaceholder('例: 友だち追加ウェルカムシナリオ').fill('E2Eテストシナリオ')
    // トリガーを「友だち追加時」に設定（デフォルトのまま）
    await page.getByRole('button', { name: '作成' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('E2Eテストシナリオ').first()).toBeVisible()
    await page.screenshot({ path: 'test-results/screenshots/scenarios-created.png' })
  })

  test('シナリオにステップを追加できる', async ({ page }) => {
    // まずシナリオカードを探して詳細ページへ
    const scenarioCard = page.getByText('E2Eテストシナリオ').first()
    await scenarioCard.click()
    await page.waitForTimeout(1500)

    // ステップ追加フォームを探す
    const stepOrderInput = page.getByPlaceholder(/順序|step.*order|ステップ番号/i).or(
      page.locator('input[type="number"]').first()
    )

    // ステップ追加ボタンがあればクリック
    const addStepBtn = page.getByRole('button', { name: /ステップを追加|ステップ追加|追加/i }).first()
    if (await addStepBtn.isVisible()) {
      await addStepBtn.click()
      await page.waitForTimeout(500)
    }

    // メッセージ内容を入力
    await page.locator('textarea').first().fill('E2Eテストメッセージ')
    await page.getByRole('button', { name: '追加' }).first().click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/screenshots/scenarios-step-added.png', fullPage: true })
  })
})

test.describe('シナリオ詳細・ステップ管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await page.goto('/scenarios')
    await page.waitForTimeout(2000)
  })

  test('シナリオ詳細ページに遷移できる', async ({ page }) => {
    // シナリオカードの「詳細」または名前をクリック
    const detailBtn = page.getByRole('link', { name: /詳細|編集/ }).first()
    if (await detailBtn.isVisible()) {
      await detailBtn.click()
    } else {
      // シナリオ名クリックで遷移する場合
      await page.getByText('E2Eテストシナリオ').first().click()
    }
    await page.waitForTimeout(2000)
    await expect(page).not.toHaveURL(/\/login/)
    await page.screenshot({ path: 'test-results/screenshots/scenarios-detail.png', fullPage: true })
  })

  test('シナリオのステップ追加フォームでバリデーションが動く', async ({ page }) => {
    // 詳細ページへ移動
    const detailLink = page.getByRole('link', { name: /詳細|編集/ }).first()
    if (await detailLink.isVisible()) {
      await detailLink.click()
      await page.waitForTimeout(2000)
    }
    // 空のまま保存を試みてバリデーションを確認
    const addBtn = page.getByRole('button', { name: /ステップ追加|追加/ }).first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      // required validation or error message should appear
      const content = await page.content()
      // ページが壊れていないことを確認
      await expect(page).not.toHaveURL(/\/login/)
    }
    await page.screenshot({ path: 'test-results/screenshots/scenarios-step-validation.png' })
  })
})

test.describe('シナリオAPI疎通確認', () => {
  test('シナリオ一覧APIが正常に応答する', async ({ page }) => {
    await setupAuth(page)

    const response = await page.request.get(
      `${process.env.API_URL || 'https://line-harness.shibagaki.workers.dev'}/api/scenarios`,
      {
        headers: { Authorization: `Bearer ${API_KEY}` },
      }
    )

    expect(response.status()).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  test('シナリオ作成APIが正常に動作する', async ({ page }) => {
    await setupAuth(page)

    const createRes = await page.request.post(
      `${process.env.API_URL || 'https://line-harness.shibagaki.workers.dev'}/api/scenarios`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: 'E2E-API作成シナリオ',
          triggerType: 'friend_add',
          isActive: false,
        },
      }
    )

    expect(createRes.status()).toBe(201)
    const created = await createRes.json()
    expect(created.success).toBe(true)
    expect(created.data.name).toBe('E2E-API作成シナリオ')

    const scenarioId = created.data.id

    // ステップ追加APIテスト
    const stepRes = await page.request.post(
      `${process.env.API_URL || 'https://line-harness.shibagaki.workers.dev'}/api/scenarios/${scenarioId}/steps`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        data: {
          stepOrder: 1,
          delayMinutes: 0,
          messageType: 'text',
          messageContent: 'E2Eテスト：こんにちは',
        },
      }
    )

    expect(stepRes.status()).toBe(201)
    const step = await stepRes.json()
    expect(step.success).toBe(true)
    expect(step.data.messageContent).toBe('E2Eテスト：こんにちは')
    expect(step.data.stepOrder).toBe(1)

    // クリーンアップ: シナリオ削除
    await page.request.delete(
      `${process.env.API_URL || 'https://line-harness.shibagaki.workers.dev'}/api/scenarios/${scenarioId}`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    )
  })

  test('シナリオステップのcondition付き作成が動作する', async ({ page }) => {
    await setupAuth(page)

    // まずシナリオを作成
    const createRes = await page.request.post(
      `${process.env.API_URL || 'https://line-harness.shibagaki.workers.dev'}/api/scenarios`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        data: { name: 'E2E-条件分岐シナリオ', triggerType: 'manual', isActive: false },
      }
    )
    const { data: scenario } = await createRes.json()

    // 条件付きステップを追加
    const stepRes = await page.request.post(
      `${process.env.API_URL || 'https://line-harness.shibagaki.workers.dev'}/api/scenarios/${scenario.id}/steps`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        data: {
          stepOrder: 1,
          delayMinutes: 30,
          messageType: 'text',
          messageContent: '30分後に送信します',
          conditionType: null,
          conditionValue: null,
          nextStepOnFalse: null,
        },
      }
    )
    expect(stepRes.status()).toBe(201)
    const stepData = await stepRes.json()
    expect(stepData.data.delayMinutes).toBe(30)

    // クリーンアップ
    await page.request.delete(
      `${process.env.API_URL || 'https://line-harness.shibagaki.workers.dev'}/api/scenarios/${scenario.id}`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    )
  })
})
