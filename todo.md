# LINE Marketing OS (line-harness-oss) — todo

最終更新: 2026-04-02（セッション8）
進捗: Phase 0〜5 完了 / LIFF セットアップ完了 / ブロッカー全解消

---

## Phase 0: 環境構築
**完了条件:** `wrangler dev` でWorkerが起動し、LINE Webhookが受信できること

- [x] line-harness-oss フォーク作成（GitHub: shibagaki-saim/line-harness-oss）← 2026-03-29完了
- [x] クローン（/Users/naoki/開発/line-harness-oss/）← 2026-03-29完了
- [x] pnpm install ← 2026-03-30完了
- [x] wrangler.toml — 既存Cloudflareリソース全流用設定済み ← 2026-03-30完了
  - D1: lmo-meta / KV: KV_SESSIONS・KV_RATE_LIMIT / R2: lmo-storage
  - Vectorize: lmo-knowledge / Queue: lmo-ai-processing・lmo-message-delivery・lmo-flow-execution
- [x] .dev.vars 全シークレット設定済み ← 2026-03-30完了
  - LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_ID
  - LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET / API_KEY / ENCRYPTION_KEY / JWT_SECRET / GEMINI_API_KEY
- [x] DBスキーマ適用（packages/db/schema.sql → lmo-meta）← 2026-03-30完了（39テーブル作成確認済み）
- [x] `wrangler dev` 起動確認 ← 2026-03-30完了（/health・/api/friends・/api/scenarios・/api/broadcasts 全応答確認）
- [x] LINE Webhook疎通確認 ← 2026-03-30完了（https://line-harness.shibagaki.workers.dev/webhook 設定・{"status":"ok"}確認）

---

## Phase 1: AIナーチャリング
**完了条件:** LINEでユーザーがメッセージを送ると、AIペルソナが自動返信できること

### 1-A: DB・インフラ
- [x] migration 013_ai.sql 作成（7テーブル）← 2026-03-30完了
  - ai_providers / ai_personas / ai_conversations
  - knowledge_docs / knowledge_chunks / human_handover_requests / ai_proactive_configs
- [x] lmo-meta に migration 適用・テーブル確認 ← 2026-03-30完了（46テーブル確認）
- [x] Vectorize インデックス確認（lmo-knowledge: 1536次元/cosine）← 2026-03-30確認
- [x] Queue 確認（lmo-ai-processing）← 2026-03-30確認

### 1-B: Worker バックエンド
- [x] Env型にPhase 1用バインディング追加 ← 2026-03-30完了
- [x] `apps/worker/src/routes/ai.ts` 実装 ← 2026-03-30完了
  - POST/GET /api/ai/providers・personas・conversations・knowledge・handover・proactive 全実装
- [x] `apps/worker/src/queues/ai-handler.ts` 実装 ← 2026-03-30完了
  - Queue受信 → Gemini/OpenAI/Anthropic LLM呼び出し → LINE返信
- [x] webhook.ts 修正: メッセージ受信 → QUEUE_AI 投入 ← 2026-03-30完了
- [x] Queue consumer 有効化（wrangler.toml）← 2026-03-30完了
- [x] デプロイ確認（https://line-harness.shibagaki.workers.dev）← 2026-03-30完了
- [x] **動作テスト**: curlでプロバイダー登録・ペルソナ作成・API応答確認 ← 2026-03-30完了
- [x] **実機テスト**: LINEメッセージ → AI自動返信（Gemini 2.5 Flash）動作確認 ← 2026-03-30完了
- [x] バグ修正: `auto_replies` テーブルに `line_account_id` カラム追加（migration 014）← 2026-03-30完了
- [x] バグ修正: Geminiモデルを `gemini-1.5-flash` → `gemini-2.5-flash` に更新（旧モデル廃止）← 2026-03-30完了

### 1-C: 管理画面 UI
- [x] `/ai/settings` — AIプロバイダー・ペルソナ設定ページ ← 2026-03-30完了
- [x] `/ai/knowledge` — ナレッジベース管理ページ ← 2026-03-30完了
- [x] `/ai/proactive` — プロアクティブ配信設定ページ ← 2026-03-30完了
- [x] `/ai/logs` — AI会話ログページ ← 2026-03-30完了
- [x] `/ai/handover` — 有人対応キューページ ← 2026-03-30完了
- [x] サイドバーに「AI」メニュー追加 ← 2026-03-30完了
- [x] **動作テスト**: 全5ページ表示確認済み ← 2026-03-30完了

---

## Phase 2: ビジュアルフロービルダー
**完了条件:** 管理画面でノード・エッジを繋いでフローを作成し、LINEユーザーに自動実行されること

### 2-A: DB・インフラ
- [x] migration 015_flows.sql 作成（3テーブル）← 2026-03-30完了
  - flows / flow_executions / flow_execution_logs
- [x] lmo-meta に migration 適用・テーブル確認 ← 2026-03-30完了
- [x] Queue 確認（lmo-flow-execution）← 2026-03-30完了

### 2-B: Worker バックエンド
- [x] `packages/db/src/flows.ts` 実装（型定義・CRUD・実行管理）← 2026-03-30完了
- [x] `apps/worker/src/routes/flows.ts` 実装 ← 2026-03-31完了
  - GET/POST/PUT/DELETE /api/flows（CRUD）
  - POST /api/flows/:id/trigger（手動起動）
  - GET  /api/flows/:id/executions（実行ログ）
  - GET  /api/flows/executions/:id/logs（ノードログ）
- [x] `apps/worker/src/queues/flow-handler.ts` 実装 ← 2026-03-31完了
  - 条件分岐（タグ有無・スコア閾値）評価
  - 待機ノード（resume_at でDB保存、cron で再開）
  - cron から `resumeWaitingFlows` を呼び出す形式
- [x] wrangler.toml: lmo-flow-execution consumer 追加 ← 2026-03-31完了
- [x] **動作テスト**: APIでフロー作成 → trigger → completed確認 ← 2026-03-31完了

### 2-C: 管理画面 UI
- [x] `@xyflow/react` インストール（apps/web）← 2026-03-31完了
- [x] `/flows` — フロー一覧ページ ← 2026-03-31完了
- [x] `/flows/editor?id=...` — ビジュアルエディタ（ノード&エッジ）← 2026-03-31完了
  - ノード種類: trigger・send_message・add_tag・remove_tag・condition・wait・end
- [x] `/flows/logs?id=...` — 実行ログページ ← 2026-03-31完了
- [x] サイドバーに「フロービルダー」セクション追加 ← 2026-03-31完了
- [x] apps/web ビルド成功確認 ← 2026-03-31完了
- [x] **動作テスト**: API経由でフロー作成 → trigger → completed確認 ← 2026-04-01完了（trigger→send_message→end 全ノードsuccess / Queue処理7秒）
- [x] **UIテスト**: 管理画面でフロー作成 → 保存 → 起動 → completed確認 ← 2026-04-01完了（実機ブラウザ動作確認済み）

---

## Phase 3: ASP高度機能（アフィリエイト）
**完了条件:** アフィリエイター登録 → 紹介URL発行 → 友だち追加 → 報酬自動計算 → 管理者承認の一連フローが動作すること

### 3-A: DB・インフラ
- [x] migration 016_asp.sql 作成（4テーブル）← 2026-04-01完了
  - asp_campaigns / asp_affiliate_campaigns / asp_rewards / asp_fraud_logs
- [x] lmo-meta に migration 適用（53テーブル確認）← 2026-04-01完了

### 3-B: Worker バックエンド
- [x] `packages/db/src/asp.ts` DB helper実装 ← 2026-04-01完了
- [x] `apps/worker/src/routes/asp.ts` 実装 ← 2026-04-01完了
  - キャンペーンCRUD（GET/POST/PUT/DELETE /api/asp/campaigns）
  - アフィリエイター×キャンペーン紐付け（/api/asp/affiliates/:id/campaigns）
  - 報酬管理（GET /api/asp/rewards / PUT /api/asp/rewards/:id/status）
  - 報酬集計（POST /api/asp/rewards/aggregate / cron 03:00 JST）
  - 不正検知（GET/POST /api/asp/fraud-logs / POST /api/asp/fraud-logs/:id/resolve）
- [x] **動作テスト**: キャンペーン作成・一覧・不正ログ取得をcurlで確認 ← 2026-04-01完了

### 3-C: アフィリエイターポータル（apps/portal/）
- [x] Next.js 15.3.9 新規アプリ作成（apps/portal/）← 2026-04-01完了
- [x] `/` ダッシュボード（成果・報酬サマリー）← 2026-04-01完了
- [x] `/links` 紹介URL・コピー機能 ← 2026-04-01完了
- [x] `/rewards` 報酬明細・ステータス表示 ← 2026-04-01完了
- [x] `/campaigns` 参加可能キャンペーン一覧 ← 2026-04-01完了
- [x] Worker Portal API（/api/portal/*）実装・デプロイ ← 2026-04-01完了
- [x] Vercelデプロイ（https://portal-six-fawn.vercel.app）← 2026-04-01完了
- [x] **動作テスト**: Portal API（login・me）curlで確認 ← 2026-04-01完了

### 3-D: 管理画面 UI
- [x] `/affiliate?tab=campaigns` キャンペーン管理 ← 2026-04-01完了
- [x] `/affiliate?tab=affiliates` アフィリエイター一覧 ← 2026-04-01完了
- [x] `/affiliate?tab=rewards` 報酬管理・承認 ← 2026-04-01完了
- [x] `/affiliate?tab=fraud` 不正検知ログ ← 2026-04-01完了
- [x] サイドバーに「ASP管理」メニュー追加 ← 2026-04-01完了
- [x] apps/web ビルド成功・Vercelデプロイ確認 ← 2026-04-01完了
- [x] **動作テスト**: 報酬集計・不正ログ作成・解決 API を curl で確認 ← 2026-04-02完了

---

## Vercel 構成整理
- [x] 誤作成された Vercel プロジェクト（line-harness-oss・out）削除 ← 2026-04-01完了
- [x] apps/web/vercel.json 作成（portal と統一形式）← 2026-04-01完了
- [x] ルート vercel.json を monorepo 対応形式に修正（pnpm固定・framework:null）← 2026-04-01完了
- [x] ルート .vercel/project.json を web プロジェクトにリンク ← 2026-04-01完了
- [x] web 本番デプロイ成功（https://web-delta-vert-34.vercel.app）← 2026-04-01完了

---

## 🚧 ブロッカー
- [x] LIFF_URL 設定完了（LIFF ID: 2009638091-3dH0uRjV）← 2026-04-02完了

---

---

## Phase 4: 分析ダッシュボード
**完了条件:** 管理画面の `/analytics` ページで友だち数推移・配信パフォーマンス・フロー効率をグラフ表示できること

### 4-A: Worker API 統計エンドポイント
- [x] `packages/db/src/analytics.ts` DB helper 実装 ← 2026-04-02完了
  - getFriendsTrend / getBroadcastStats / getFlowStats / getAiStats / getOverviewStats
- [x] `apps/worker/src/routes/analytics.ts` 実装 ← 2026-04-02完了
  - GET /api/analytics/overview・friends・broadcasts・flows・ai
- [x] Worker にルート追加・デプロイ ← 2026-04-02完了
- [x] **動作テスト**: curl で全5エンドポイント確認 ← 2026-04-02完了

### 4-B: 管理画面 UI
- [x] recharts インストール ← 2026-04-02完了
- [x] `/analytics` — 分析ダッシュボードページ ← 2026-04-02完了
  - 友だち数推移グラフ（折れ線）
  - 配信成功率（積み上げ棒グラフ）
  - フロー実行サマリー（進捗バー）
  - AIナーチャリング統計（KPIカード）
- [x] サイドバー「分析」セクションに「分析ダッシュボード」追加 ← 2026-04-02完了
- [x] apps/web ビルド成功・Vercelデプロイ（https://web-delta-vert-34.vercel.app）← 2026-04-02完了
- [x] **動作テスト**: 管理画面でグラフ表示確認 ← 2026-04-02完了

---

---

## Phase 5: リッチメニュー管理UI
**完了条件:** 管理画面でリッチメニューの一覧・作成・削除・デフォルト設定ができること

### 5-A: APIクライアント・型定義
- [x] `apps/web/src/lib/api.ts` に RichMenu 型・API メソッド追加 ← 2026-04-02完了

### 5-B: 管理画面 UI
- [x] `/rich-menus` — リッチメニュー一覧ページ ← 2026-04-02完了
  - 既存メニュー一覧（名前・エリア数・選択中フラグ・プレビュー）
  - デフォルト設定ボタン / 削除ボタン / 画像アップロードモーダル
  - 新規作成モーダル（JSON エディタ + 2分割/3分割/6分割テンプレート）
- [x] サイドバーに「リッチメニュー」追加（配信セクション）← 2026-04-02完了
- [x] apps/web ビルド・Vercelデプロイ確認 ← 2026-04-02完了
- [x] **動作テスト**: 管理画面で一覧表示・作成・デフォルト設定・削除・画像アップロード確認 ← 2026-04-02完了

---

---

## Phase 6: 配信セーフガード
**完了条件:** 大量配信・ブロードキャスト送信前に誤送信を防ぐ仕組みが動作すること
**優先度:** 高（本番運用で取り返しのつかないミスを防ぐ）
**参考:** upstream Issue #64

### 6-A: Worker バックエンド
- [x] 送信前に対象者リストのプレビューを返す `POST /api/broadcasts/:id/preview` エンドポイント追加 ← 2026-04-02完了
  - recipientCount（対象件数）・title・messageType・messageContent・targetType・targetTagId を返す
  - （`dry_run` クエリパラメータ・`max_recipients` バリデーションは preview 方式で代替）

### 6-B: 管理画面 UI
- [x] ブロードキャスト送信ボタンに「送信件数確認モーダル」を追加 ← 2026-04-02完了
  - 「今すぐ送信」クリック → preview API 呼び出し → 件数・タイトル・タイプを表示してから送信
  - キャンセルで送信中断
- [x] **E2E テスト**: Phase 6 全4テスト通過（Playwright）← 2026-04-02完了

---

## Phase 7: CTR 計測・配信レポート
**完了条件:** 配信ごとのクリック数・CTR を分析ダッシュボードで確認できること
**優先度:** 高（既存の分析ダッシュボードを拡張するだけ）
**参考:** upstream Issue #61

### 7-A: DB・インフラ
- [x] `link_clicks` テーブルに `broadcast_id` カラム追加（migration 020_link_click_broadcast.sql）← 2026-04-02完了
  - （新テーブルではなく既存 link_clicks に broadcast_id FK を追加する方式で実装）
  - D1 に `ALTER TABLE link_clicks ADD COLUMN broadcast_id TEXT` 適用済み（tracked_links・link_clicks テーブルは手動作成）

### 7-B: Worker バックエンド
- [x] トラッキングリンクのクリック時に `?b=broadcastId` で broadcast_id を紐付けて記録 ← 2026-04-02完了
  - `packages/db/src/tracked-links.ts` の `recordLinkClick()` に `broadcastId` 引数追加
  - `apps/worker/src/routes/tracked-links.ts` でクエリパラメータ `b` を取得して渡す
  - `apps/worker/src/services/broadcast.ts` で送信前に tracked URL へ `?b=broadcastId` を自動付与
- [x] `GET /api/broadcasts/:id/report` — 個別配信レポートエンドポイント追加 ← 2026-04-02完了
  - totalCount・successCount・clickCount・CTR・クリックした友だちリスト（最新50件）

### 7-C: 管理画面 UI
- [x] ブロードキャスト一覧（`/broadcasts`）の送信済み行に「レポート」ボタン追加 ← 2026-04-02完了
- [x] 個別配信レポートモーダル（送信数・成功数・クリック数・CTR・クリックした友だちリスト）← 2026-04-02完了
- [x] **E2E テスト**: Phase 7 全3テスト通過（Playwright）← 2026-04-02完了

---

## Phase 8: LINE チャネルアクセストークン自動更新
**完了条件:** アクセストークンの有効期限を監視し、期限切れ前に自動更新できること
**優先度:** 中（長期運用で必須）
**参考:** upstream v0.8.0 token_refresh サービス

### 8-A: DB・インフラ
- [x] `line_accounts` テーブルに `token_expires_at` カラム追加（migration 009 適用済み）← 2026-04-02完了
  - `ALTER TABLE line_accounts ADD COLUMN token_expires_at TEXT` を D1 remote に直接適用

### 8-B: Worker バックエンド
- [x] `apps/worker/src/services/token-refresh.ts` 実装（フォーク元で既存）← 2026-04-02確認
  - `POST https://api.line.me/v2/oauth/accessToken`（client_credentials）でstatelessトークン発行
  - 有効期限7日未満 or NULL → 自動更新、D1 に token_expires_at 保存
- [x] cron（`0 0 * * *`）から `refreshLineAccessTokens()` 呼び出し追加済み ← 2026-04-02確認
- [x] `GET /api/line-accounts` レスポンスに `tokenExpiresAt` 追加 ← 2026-04-02完了
- [x] `POST /api/line-accounts/:id/refresh-token` 手動更新エンドポイント追加 ← 2026-04-02完了
- [x] `GET /api/line-accounts` の friends/messages_log クエリの `line_account_id` バグ修正 ← 2026-04-02完了
  - `friends` テーブルに `line_account_id` カラムが存在しなかったため、全件集計に修正

### 8-C: 管理画面 UI
- [x] `/health` ページにトークン有効期限バッジ（残日数・緑/黄/赤）表示 ← 2026-04-02完了
- [x] 「トークン更新」ボタンで手動更新対応 ← 2026-04-02完了
- [x] **動作確認**: Playwright テストで「残30日 (2026/5/2)」バッジと更新ボタン表示確認 ← 2026-04-02完了

---

---

## Phase 9: 既存ページ 動作確認ツアー
**目的:** フォーク元から引き継いだ未テストページを順番に動作確認し、バグがあれば修正する
**進め方:** 1ページずつ確認 → NG なら即修正 → [x] にして次へ

### 確認順序・チェックリスト

#### 9-1: 個別チャット `/chats`
- [x] チャット一覧が表示される（友だちとのチャットが出る）← 2026-04-02確認
- [x] チャットを開いてメッセージ履歴が表示される ← 2026-04-02確認
- [x] テキストメッセージを送信できる ← 2026-04-02確認
- [x] ステータス変更（未読→対応中→解決済）が動作する ← 2026-04-02確認

#### 9-2: オートメーション `/automations`
- [x] オートメーション一覧が表示される ← 2026-04-02 Playwright確認
- [x] 新規作成モーダルが開く ← 2026-04-02 Playwright確認
- [x] ルール名・イベントタイプを設定して保存できる ← 2026-04-02 Playwright確認

#### 9-3: スコアリング `/scoring`
- [x] スコアリングルール一覧が表示される ← 2026-04-02 Playwright確認
- [x] 新規ルールを作成できる（ルール名・イベント・スコア値）← 2026-04-02 Playwright確認

#### 9-4: Webhook `/webhooks`
- [x] 受信 Webhook 一覧が表示される ← 2026-04-02 Playwright確認
- [x] 送信 Webhook 一覧が表示される ← 2026-04-02 Playwright確認
- [x] 受信 Webhook を新規作成できる ← 2026-04-02 Playwright確認
- [x] 送信 Webhook を新規作成できる ← 2026-04-02 Playwright確認

#### 9-5: 通知 `/notifications`
- [x] 通知ルール一覧が表示される ← 2026-04-02 Playwright確認
- [x] 新規通知ルールを作成できる ← 2026-04-02 Playwright確認

#### 9-6: フォーム回答 `/form-submissions`
- [x] フォーム一覧が表示される ← 2026-04-02 Playwright確認

#### 9-7: CV計測 `/conversions`
- [x] CV ポイント一覧が表示される ← 2026-04-02 Playwright確認
- [x] 新規 CV ポイントを作成できる ← 2026-04-02 Playwright確認

#### 9-8: 流入経路 `/affiliates`
- [x] 流入元サマリーが表示される ← 2026-04-02 Playwright確認

#### 9-9: BAN検知 `/health`
- [x] アカウントヘルス情報が表示される ← 2026-04-02 Playwright確認

#### 9-10: UUID管理 `/users`
- [x] UUID ユーザー一覧が表示される（1件確認）← 2026-04-02 Playwright確認

#### 9-11: LINEアカウント `/accounts`
- [x] LINE アカウント一覧が表示される ← 2026-04-02 Playwright確認

#### 9-12: スタッフ管理 `/staff`
- [x] スタッフ一覧が表示される ← 2026-04-02 Playwright確認
- [x] 新規スタッフを作成できる ← 2026-04-02 Playwright確認

#### 9-13: 緊急コントロール `/emergency`
- [x] 緊急停止ボタンが表示される ← 2026-04-02 Playwright確認
- [x] 誤操作防止の確認ダイアログが出る（キャンセルで中断）← 2026-04-02 Playwright確認

---

---

## Phase 10: メール+パスワード認証
**完了条件:** API キー入力なしで email + password でログインできること
**優先度:** 高（UX改善・セキュリティ向上）
**技術方針:**
- パスワードハッシュ: PBKDF2-SHA256（10万回）※ Workers で bcrypt 非対応
- セッション: KV_SESSIONS（TTL 7日）
- 既存 env API_KEY 認証は残す（CC・curl 用）

### 10-A: DB マイグレーション
- [x] `migration 019_staff_password.sql` 作成・適用
  - `staff_members` に `password_hash TEXT` カラム追加 ← 2026-04-02完了（--command フラグで直接適用）

### 10-B: Worker — パスワードユーティリティ
- [x] `apps/worker/src/services/password.ts` 新規作成 ← 2026-04-02完了
  - `hashPassword(password)` → `{saltHex}:{hashHex}`（Web Crypto API PBKDF2-SHA256, 100k iterations）
  - `verifyPassword(password, stored)` → boolean（定数時間比較）

### 10-C: Worker — DB ヘルパー追加
- [x] `packages/db/src/staff.ts` に追記 ← 2026-04-02完了
  - `getStaffByEmail(db, email)` / `updateStaffPassword(db, id, hash)` / `countAllStaff(db)`

### 10-D: Worker — 認証ルート新規作成
- [x] `apps/worker/src/routes/auth.ts` 新規作成 ← 2026-04-02完了
  - `POST /api/auth/login` / `POST /api/auth/logout` / `GET /api/auth/me` / `POST /api/auth/setup`
- [x] `apps/worker/src/index.ts` にルート追加 ← 2026-04-02完了

### 10-E: Worker — 認証ミドルウェア更新
- [x] `apps/worker/src/middleware/auth.ts` 修正 ← 2026-04-02完了
  - 優先順: KV_SESSIONS session_token → staff.api_key → env API_KEY

### 10-F: Worker — スタッフ管理 API 更新
- [x] `apps/worker/src/routes/staff.ts` 修正 ← 2026-04-02完了
  - スタッフ作成時に `password` フィールド受付
  - `POST /api/staff/:id/reset-password` 追加

### 10-G: Web — ログインページ差し替え
- [x] `apps/web/src/app/login/page.tsx` 全書き換え ← 2026-04-02完了
  - email + password フォーム、`POST /api/auth/login` 呼び出し

### 10-H: Web — API クライアント更新
- [x] `apps/web/src/lib/api.ts` 修正 ← 2026-04-02完了
  - `lh_api_key` → `lh_session_token`、401時自動 `/login` リダイレクト
- [x] `apps/web/src/components/auth-guard.tsx` 修正 ← 2026-04-02完了
- [x] `apps/web/src/components/layout/sidebar.tsx` ログアウト処理修正 ← 2026-04-02完了

### 10-I: Web — スタッフ管理画面更新
- [x] `apps/web/src/app/staff/page.tsx` 修正 ← 2026-04-02完了
  - APIキー関連UI完全削除（バナー・APIキー列・キー再生成ボタン）
  - スタッフ作成フォームにパスワード入力欄追加
  - 「PW変更」ボタン + モーダル追加

### 10-J: E2E テスト更新
- [x] `apps/e2e/tests/` の `setupAuth()` を `lh_session_token` に変更 ← 2026-04-02完了
- [x] `apps/e2e/tests/auth.spec.ts` 新規作成（5テスト全パス）← 2026-04-02完了
  - ログイン成功 / 未入力でボタン無効 / 誤パスワードエラー / ログアウト / 未認証リダイレクト

### 10-K: デプロイ・動作確認
- [x] migration 適用（D1） ← 2026-04-02完了
- [x] Worker デプロイ（v367133be）← 2026-04-02完了
- [x] オーナーアカウント作成（admin@line-harness.local）← 2026-04-02完了
- [x] Web ビルド・Vercel デプロイ ← 2026-04-02完了
- [x] Playwright E2E テスト全パス（26+5 = 31テスト）← 2026-04-02完了

---

## 📍 次回セッション引き継ぎ（最終更新: 2026-04-02）
- 現在取り組んでいる箇所: **Phase 8 完了**
- **次にやること:** 残タスクなし（Phase 0〜10・Phase 6〜8 全完了）
  - 必要に応じて新機能追加や改善タスクを検討する
- Playwright: `apps/e2e/` — `npx playwright test` で全テスト実行（tour + interactions + auth + broadcasts 計38テスト）
  - ⚠️ `BASE_URL` 未指定時は `web-delta-vert-34.vercel.app`（stableエイリアス）を使用。ハッシュ付きURLはVercel SSO保護で失敗する
- 備考: `vercel pull --yes --environment=production && vercel build --prod && vercel deploy --prebuilt --prod` を使う（リモートビルドが npm fallback するバグを回避）
- 管理画面ログイン:
  - メール: admin@line-harness.local
  - パスワード: Harness2024!
  - ロール: owner
- LIFF設定:
  - LIFF ID: 2009638091-3dH0uRjV
  - LIFF URL: https://liff.line.me/2009638091-3dH0uRjV
  - エンドポイント: https://line-harness.shibagaki.workers.dev/
  - VITE_LIFF_ID: apps/worker/.env に記載
  - LIFF_URL: wrangler secret に設定済み
- AI設定状況（DB内、本番稼働中）:
  - Provider: Gemini 2.5 Flash（ID: 7c92e9b1-3e24-4c84-b21c-6e29bc76fe1e）
  - Persona: デフォルトAI（ID: 6413bf09-9755-4c46-9ca4-c90e455c04e6、max_tokens: 1000）
- URL一覧:
  - 管理画面: https://web-delta-vert-34.vercel.app（メールログイン方式に移行済み）
  - ポータル: https://portal-six-fawn.vercel.app（紹介コードでログイン、テスト用: test-taro）
  - Worker API: https://line-harness.shibagaki.workers.dev
  - LIFF: https://liff.line.me/2009638091-3dH0uRjV
- 注意事項:
  - 管理画面Vercelデプロイ: ルートから `npx vercel --prod`
  - ポータルVercelデプロイ: `apps/portal/` から `vercel deploy --prod` でOK
  - Worker デプロイ: `apps/worker/` から `pnpm run deploy`（vite build + wrangler deploy）
  - Vercel installCommand: `npm i -g pnpm@9.15.4 && pnpm install --no-frozen-lockfile`（lockfileバージョン不一致のため固定）
  - Cloudflare Workers では Buffer 未対応 → btoa/atob を使う
  - Next.js static export では動的セグメント[id]はクエリパラメータ方式で実装
  - フロー実行エンジン: 待機ノードは resume_at をDBに保存し、cron（*/5 * * * *）でresumeWaitingFlowsを呼び出す
  - テストアフィリエイター「テスト太郎」（code: test-taro）がDB内に存在
  - LINE Login チャネルには Messaging API チャネルのリンクが必要（友だち追加オプション用）
  - E2E テスト `auth.spec.ts` でログアウトボタンは `.last()` を使う（DOMに2つ存在し1つ目は不可視）
