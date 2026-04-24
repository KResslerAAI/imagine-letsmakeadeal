-- Let's Make a Deal: Automation Edition
-- Run this once to initialize your Neon database.
-- Safe to re-run (all statements are idempotent).

CREATE TABLE IF NOT EXISTS game_state (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  state         TEXT NOT NULL DEFAULT 'lobby',
  use_case_1_title TEXT NOT NULL DEFAULT 'Use Case 1',
  use_case_1_desc  TEXT NOT NULL DEFAULT '',
  use_case_2_title TEXT NOT NULL DEFAULT 'Use Case 2',
  use_case_2_desc  TEXT NOT NULL DEFAULT '',
  use_case_3_title TEXT NOT NULL DEFAULT 'Use Case 3',
  use_case_3_desc  TEXT NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the single row if it doesn't exist
INSERT INTO game_state (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS votes (
  id             SERIAL PRIMARY KEY,
  attendee_id    TEXT NOT NULL,
  attendee_name  TEXT NOT NULL,
  round          INTEGER NOT NULL CHECK (round IN (1, 2)),
  amount_1       INTEGER NOT NULL CHECK (amount_1 >= 0),
  amount_2       INTEGER NOT NULL CHECK (amount_2 >= 0),
  amount_3       INTEGER NOT NULL CHECK (amount_3 >= 0),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT total_budget  CHECK (amount_1 + amount_2 + amount_3 = 300000),
  CONSTRAINT unique_vote   UNIQUE (attendee_id, round)
);
