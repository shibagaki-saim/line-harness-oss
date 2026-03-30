-- Add line_account_id to auto_replies (missed in 008_multi_account.sql)
ALTER TABLE auto_replies ADD COLUMN line_account_id TEXT REFERENCES line_accounts(id) ON DELETE CASCADE;
