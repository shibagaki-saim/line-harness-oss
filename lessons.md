# Lessons — line-harness-oss

## 2026-03-30 Cloudflare Workers では Buffer が使えない

**教訓**: Cloudflare Workers 環境では Node.js の `Buffer` は未定義。base64エンコード/デコードは `btoa()` / `atob()` を使う。
**背景**: `ai-handler.ts` に `Buffer.from(encoded, 'base64').toString('utf-8')` を書いたが TypeScript ビルドエラーが発生。
**適用場面**: Cloudflare Workers 上でバイナリ/base64処理を書くとき。

---

## 2026-03-30 DBリセット後は既存ユーザーが再フォロー必要

**教訓**: D1 DBをリセット（DROP TABLE）すると `friends` テーブルが空になる。既存 LINE ユーザーからのメッセージは `getFriendByLineUserId` が null を返し、処理が無言でスキップされる。
**背景**: DB移行後に実機テストしたが返信がなく、ログ確認で判明。
**適用場面**: DB移行・リセット後の動作テスト時。ユーザーに再フォロー（ブロック→解除）を依頼する。

---

## 2026-03-30 auto_replies テーブルに line_account_id カラムが欠落

**教訓**: migration 008_multi_account.sql で `auto_replies` への `line_account_id` 追加が漏れていた。webhook.ts がこのカラムを参照するため `D1_ERROR: no such column` で処理が落ちる。
**背景**: エラーログは `Error handling webhook event:` として外側のcatchに出るが、デバッグログなしでは特定が難しい。
**適用場面**: 新テーブルや既存テーブルのカラム追加を伴うマルチアカウント拡張時は、参照する全テーブルをリストアップして漏れがないか確認する。

---

## 2026-03-30 Gemini API のモデル名は定期的に廃止される

**教訓**: `gemini-1.5-flash` は新規ユーザー向けに廃止済み。`gemini-2.5-flash` など最新モデルを使う。モデル一覧は `GET /v1beta/models` で確認できる。
**背景**: DBにプロバイダーを登録したが返答が「応答を生成できませんでした。」となり、API直叩きで 404 NOT_FOUND を確認して判明。
**適用場面**: Gemini モデルを指定するとき・ドキュメント記載のモデル名が古い可能性がある場合。
