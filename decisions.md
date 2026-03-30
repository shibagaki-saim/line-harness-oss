# Decisions — line-harness-oss

## 2026-03-30 Cloudflare リソースは既存 lmo-* をそのまま流用

**決定**: 新規リソースを作らず、旧プロジェクト（Lステップ代替/）の Cloudflare リソースをバインディング名だけ変えて再利用する。
**理由**: 無料プランのリソース上限節約、既存データの再利用、セットアップ工数の削減。
**却下案**: 新規 D1/KV/R2 作成（理由: 無料枠を余分に消費し移行作業が増える）
**再考トリガー**: 本番マルチテナント化、または旧データとの分離が必要になったとき。

---

## 2026-03-30 LLM 呼び出しは Cloudflare Queue 経由で非同期処理

**決定**: LINE Webhook → Queue 投入（即200返却）→ Queue Consumer → LLM API → pushMessage のフロー。
**理由**: LINE の Webhook は約1秒以内のレスポンス必須。LLM の応答は数秒かかるため同期呼び出し不可。
**却下案**: Webhook ハンドラ内で直接 LLM 呼び出し（理由: タイムアウトで LINE がリトライし無限ループになる可能性）
**再考トリガー**: Edge streaming や超高速モデルが普及し1秒以内に LLM が返答できるようになったとき。

---

## 2026-03-30 AI API キーは D1 に暗号化保存（btoa方式）

**決定**: AIプロバイダーの API キーは `btoa(key[0:8] + ":" + apiKey)` で簡易暗号化して D1 に保存。`ENCRYPTION_KEY` 環境変数で復号。
**理由**: Cloudflare Workers に Node.js の crypto モジュールがなく、AES等の実装が複雑。btoa はシンプルで動作確認済み。
**却下案**: WebCrypto API で AES-GCM 暗号化（理由: 実装コスト高、現時点でオーバースペック）
**再考トリガー**: セキュリティ要件が上がったとき（本番マルチテナント化・外部監査等）。

---

## 2026-03-31 フロービルダー UI のルーティングにクエリパラメータを採用

**決定**: `/flows/editor?id=...` / `/flows/logs?id=...` の形式でURLを設計。動的セグメント（`[id]`）は使わない。
**理由**: Next.js `output: 'export'` では動的ルートに `generateStaticParams()` が必須だが、`'use client'` との共存ができず、Server Component ラッパー経由でも Next.js が検出しないケースがあった。クエリパラメータ方式なら静的ページとして問題なくビルドできる。
**却下案**: `/flows/[id]/edit` 動的ルート方式（理由: Next.js 15 static export でビルドエラー解消不能）
**再考トリガー**: Next.js のバージョンアップで制約が変わったとき、またはSPA的なルーティングライブラリ（TanStack Router等）に移行するとき。

---

## 2026-03-31 フロー実行エンジンのwaitノード再開はcronポーリング方式

**決定**: waitノードで実行を中断し `resume_at` をDBに保存。cron（*/5 * * * *）で `getWaitingFlowExecutions()` を呼び出し、再開すべき実行をキューに再投入する。
**理由**: Cloudflare Workers の Queues には遅延配信機能がないため、タイマーベースの再開ができない。D1にresumeAtを保存してポーリングするのが最もシンプル。
**却下案**: Durable Objects でタイマー管理（理由: 実装複雑度が高く、現時点でオーバースペック）
**再考トリガー**: Cloudflare Queues に遅延配信が追加されたとき。

---

## 2026-03-30 Gemini モデルは gemini-2.5-flash を使用

**決定**: デフォルトの Gemini モデルとして `gemini-2.5-flash` を採用。
**理由**: `gemini-1.5-flash` は新規ユーザー向けに廃止。`gemini-2.0-flash` も同様に廃止済み。`gemini-2.5-flash` が現時点で利用可能な最新の Flash モデル。
**却下案**: `gemini-2.0-flash`（理由: 新規ユーザー向け廃止）、`gemini-2.5-pro`（理由: コスト高）
**再考トリガー**: Gemini モデルのラインナップが変わったとき（定期的に確認推奨）。
