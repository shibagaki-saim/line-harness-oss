# LINE Marketing OS (line-harness-oss) — todo

最終更新: 2026-03-30（セッション3）
進捗: Phase 0 完了 / Phase 1-A・1-B 完了・実機テスト済み / Phase 1-C（管理画面UI）着手待ち

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
- [ ] `/ai/settings` — AIプロバイダー・ペルソナ設定ページ
- [ ] `/ai/knowledge` — ナレッジベース管理ページ
- [ ] `/ai/proactive` — プロアクティブ配信設定ページ
- [ ] `/talk` にタブ追加: `ai-logs`（会話ログ）・`handover`（有人切替キュー）
- [ ] サイドバーに「AI」メニュー追加
- [ ] **動作テスト**: 管理画面からペルソナ設定 → LINE返信内容に反映確認

---

## Phase 2: ビジュアルフロービルダー
**完了条件:** 管理画面でノード・エッジを繋いでフローを作成し、LINEユーザーに自動実行されること

### 2-A: DB・インフラ
- [ ] migration 002_flows.sql 作成（3テーブル）
  - flows / flow_executions / flow_execution_logs
- [ ] lmo-meta に migration 適用・テーブル確認
- [ ] Queue 確認（lmo-flow-execution）

### 2-B: Worker バックエンド
- [ ] `apps/worker/src/routes/flows.ts` 実装
  - GET/POST/PUT/DELETE /api/flows（CRUD）
  - POST /api/flows/:id/trigger（手動起動）
  - GET  /api/flows/:id/executions（実行ログ）
- [ ] `apps/worker/src/queues/flow-handler.ts` 実装
  - 条件分岐（タグ・スコア・メタデータ）評価
  - 遅延実行（cron で next_run_at ポーリング）
- [ ] **動作テスト**: APIでフロー作成 → trigger → 実行ログ確認

### 2-C: 管理画面 UI
- [ ] `@xyflow/react` インストール（apps/web）
- [ ] `/flows` — フロー一覧ページ
- [ ] `/flows/:id/edit` — ビジュアルエディタ（ノード&エッジ）
  - ノード種類: 送信・条件分岐・タグ付与・待機・終了
- [ ] `/flows/:id/logs` — 実行ログページ
- [ ] サイドバー「配信」タブに flows 追加
- [ ] **動作テスト**: エディタでフロー作成 → 保存 → LINEユーザーに実行確認

---

## Phase 3: ASP高度機能（アフィリエイト）
**完了条件:** アフィリエイター登録 → 紹介URL発行 → 友だち追加 → 報酬自動計算 → 管理者承認の一連フローが動作すること

### 3-A: DB・インフラ
- [ ] migration 003_asp.sql 作成（5テーブル）
  - asp_campaigns / asp_affiliates / asp_tracked_conversions / asp_rewards / asp_fraud_logs
- [ ] lmo-meta に migration 適用・テーブル確認

### 3-B: Worker バックエンド
- [ ] `apps/worker/src/routes/asp.ts` 実装
  - キャンペーンCRUD
  - アフィリエイター管理・招待メール送信
  - コンバージョン計測（existing conversions.ts 拡張）
  - 報酬計算（cron 0 3 * * * で自動集計）
  - 不正検知（同一IP・短時間大量CV）
- [ ] **動作テスト**: キャンペーン作成 → 紹介リンク発行 → コンバージョン → 報酬計算確認

### 3-C: アフィリエイターポータル（apps/portal/）
- [ ] Next.js 15 新規アプリ作成（pnpm create next-app）
- [ ] `/` ダッシュボード（成果・報酬サマリー）
- [ ] `/links` 紹介URL・QRコード発行
- [ ] `/rewards` 報酬明細・振込状況
- [ ] `/campaigns` 参加可能キャンペーン一覧
- [ ] **動作テスト**: アフィリエイターログイン → 紹介URL取得 → 報酬確認

### 3-D: 管理画面 UI
- [ ] `/affiliate?tab=campaigns` キャンペーン管理
- [ ] `/affiliate?tab=affiliates` アフィリエイター一覧
- [ ] `/affiliate?tab=rewards` 報酬管理・承認
- [ ] `/affiliate?tab=fraud` 不正検知ログ
- [ ] **動作テスト**: 管理画面から報酬承認 → ポータルに反映確認

---

## 🚧 ブロッカー
- [ ] LIFF_URL 未設定（LIFFアプリ作成が必要）← Phase 1-C着手時に対応

---

## 📍 次回セッション引き継ぎ（最終更新: 2026-03-30）
- 現在取り組んでいる箇所: Phase 1-B完了・実機テスト済み → Phase 1-C 管理画面UI着手
- 次にやること: Phase 1-C管理画面UI
  1. `/ai/settings` — AIプロバイダー・ペルソナ設定ページ
  2. `/ai/knowledge` — ナレッジベース管理ページ
  3. `/ai/proactive` — プロアクティブ配信設定ページ
  4. `/talk` にタブ追加: `ai-logs`・`handover`
  5. サイドバーに「AI」メニュー追加
- AI設定状況（DB内、本番稼働中）:
  - Provider: Gemini 2.5 Flash（ID: 7c92e9b1-3e24-4c84-b21c-6e29bc76fe1e）
  - Persona: デフォルトAI（ID: 6413bf09-9755-4c46-9ca4-c90e455c04e6、max_tokens: 1000）
- 注意事項:
  - Cloudflare Workers では Buffer 未対応 → btoa/atob を使う（ai-handler.tsで適用済み）
  - LIFF_URL未設定（.dev.vars で「要入力」のまま）← Phase 1-C着手時に対応
  - ペルソナのシステムプロンプトは現在フレンドリー設定。用途に合わせて管理画面から調整予定
