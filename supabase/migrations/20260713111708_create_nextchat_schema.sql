/*
# Create NextChat database schema

## Overview
This migration creates the core database tables for the NextChat application,
enabling cloud-based persistence of chat sessions, messages, masks (prompt
templates), application configuration, and API access configuration. The app
currently stores all of this in browser localStorage/IndexedDB; this schema
moves it to Supabase so data survives across devices and browser clears.

## New Tables

1. `sessions` — Chat sessions (conversations)
   - `id` (text, primary key) — nanoid-generated session ID
   - `topic` (text) — display title of the session
   - `memory_prompt` (text) — compressed/summarized memory context
   - `stat` (jsonb) — token/word/char counts `{ tokenCount, wordCount, charCount }`
   - `last_update` (bigint) — epoch milliseconds of last activity
   - `last_summarize_index` (integer) — index of last summarized message
   - `clear_context_index` (integer, nullable) — index where context was cleared
   - `mask_id` (text, nullable) — reference to mask used for this session
   - `created_at` (timestamptz) — row creation timestamp

2. `messages` — Individual messages within sessions (normalized out of the
   session's `messages` array for efficient querying)
   - `id` (text, primary key) — nanoid-generated message ID
   - `session_id` (text, FK → sessions.id ON DELETE CASCADE) — parent session
   - `role` (text) — "user" | "assistant" | "system"
   - `content` (text) — message text content
   - `date` (text) — locale-string timestamp from the client
   - `model` (text, nullable) — model name that produced this message
   - `streaming` (boolean, default false) — whether the message is mid-stream
   - `is_error` (boolean, default false) — whether this message represents an error
   - `tools` (jsonb, nullable) — tool-call metadata array
   - `audio_url` (text, nullable) — TTS audio URL if present
   - `is_mcp_response` (boolean, default false) — whether this is an MCP response
   - `multimodal_content` (jsonb, nullable) — images/attachments
   - `seq` (integer) — ordering within the session
   - `created_at` (timestamptz) — row creation timestamp

3. `masks` — Prompt templates / personas
   - `id` (text, primary key) — nanoid-generated mask ID
   - `name` (text) — display name
   - `avatar` (text) — avatar identifier
   - `hide_context` (boolean, default false) — whether to hide context messages
   - `context` (jsonb) — array of context messages
   - `sync_global_config` (boolean, default true) — whether to use global model config
   - `model_config` (jsonb) — model configuration override
   - `lang` (text) — language code
   - `builtin` (boolean, default false) — whether this is a built-in mask
   - `plugin` (jsonb, nullable) — array of plugin IDs
   - `enable_artifacts` (boolean, nullable) — artifacts toggle
   - `enable_code_fold` (boolean, nullable) — code folding toggle
   - `created_at` (bigint) — epoch milliseconds (matches client Mask.createdAt)
   - `row_created_at` (timestamptz) — row creation timestamp

4. `app_config` — Global application configuration (single-row table)
   - `id` (integer, primary key, default 1) — enforced singleton
   - `config` (jsonb) — the full DEFAULT_CONFIG object (theme, font, model settings, etc.)
   - `updated_at` (timestamptz) — last modification timestamp

5. `access_config` — API access / provider configuration (single-row table)
   - `id` (integer, primary key, default 1) — enforced singleton
   - `config` (jsonb) — the full access state (API keys, endpoints, provider settings)
   - `updated_at` (timestamptz) — last modification timestamp

## Security
- RLS enabled on ALL tables.
- All policies use `TO anon, authenticated` because NextChat has no sign-in
  screen — the frontend operates as the `anon` role for its entire lifetime.
- All CRUD operations are allowed for anon + authenticated (single-tenant,
  intentionally shared/public data model).

## Important Notes
1. The `sessions` and `messages` tables use text PKs (nanoid) to preserve
   the client-generated IDs that NextChat already uses everywhere.
2. `messages.session_id` has `ON DELETE CASCADE` so deleting a session
   automatically removes its messages.
3. `app_config` and `access_config` are singleton tables (CHECK constraint
   forces `id = 1`) — they store one JSON blob each, matching the Zustand
   persist store shape the client already serializes.
4. The `seq` column on `messages` preserves message ordering within a session,
   since the client stores messages as an ordered array.
5. `mask_id` on `sessions` is a loose reference (no FK constraint) because
   masks can be deleted independently; the session should survive.
*/

-- ── sessions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  topic text NOT NULL DEFAULT '',
  memory_prompt text NOT NULL DEFAULT '',
  stat jsonb NOT NULL DEFAULT '{"tokenCount":0,"wordCount":0,"charCount":0}'::jsonb,
  last_update bigint NOT NULL DEFAULT 0,
  last_summarize_index integer NOT NULL DEFAULT 0,
  clear_context_index integer,
  mask_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE
  TO anon, authenticated USING (true);

-- ── messages ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  date text NOT NULL DEFAULT '',
  model text,
  streaming boolean NOT NULL DEFAULT false,
  is_error boolean NOT NULL DEFAULT false,
  tools jsonb,
  audio_url text,
  is_mcp_response boolean NOT NULL DEFAULT false,
  multimodal_content jsonb,
  seq integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_seq ON messages(session_id, seq);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);

-- ── masks ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS masks (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT 'gpt-bot',
  hide_context boolean NOT NULL DEFAULT false,
  context jsonb NOT NULL DEFAULT '[]'::jsonb,
  sync_global_config boolean NOT NULL DEFAULT true,
  model_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  lang text NOT NULL DEFAULT 'en',
  builtin boolean NOT NULL DEFAULT false,
  plugin jsonb,
  enable_artifacts boolean,
  enable_code_fold boolean,
  created_at bigint NOT NULL DEFAULT 0,
  row_created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE masks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_masks" ON masks;
CREATE POLICY "anon_select_masks" ON masks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_masks" ON masks;
CREATE POLICY "anon_insert_masks" ON masks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_masks" ON masks;
CREATE POLICY "anon_update_masks" ON masks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_masks" ON masks;
CREATE POLICY "anon_delete_masks" ON masks FOR DELETE
  TO anon, authenticated USING (true);

-- ── app_config (singleton) ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_config" ON app_config;
CREATE POLICY "anon_select_app_config" ON app_config FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_config" ON app_config;
CREATE POLICY "anon_insert_app_config" ON app_config FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_config" ON app_config;
CREATE POLICY "anon_update_app_config" ON app_config FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_config" ON app_config;
CREATE POLICY "anon_delete_app_config" ON app_config FOR DELETE
  TO anon, authenticated USING (true);

-- ── access_config (singleton) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS access_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE access_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_access_config" ON access_config;
CREATE POLICY "anon_select_access_config" ON access_config FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_access_config" ON access_config;
CREATE POLICY "anon_insert_access_config" ON access_config FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_access_config" ON access_config;
CREATE POLICY "anon_update_access_config" ON access_config FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_access_config" ON access_config;
CREATE POLICY "anon_delete_access_config" ON access_config FOR DELETE
  TO anon, authenticated USING (true);