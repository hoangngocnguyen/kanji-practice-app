-- ============================================================================
-- Migration Script: Flashcard Example Sentences Table (public.flashcard_examples)
-- Run this script in your Supabase Dashboard -> SQL Editor to upgrade existing DB
-- ============================================================================

create table if not exists public.flashcard_examples (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id text not null,
  target_type text not null check (target_type in ('kanji', 'compound')),
  compound_word_id text,
  target_text text not null default '',
  sentence_jp text not null,
  sentence_kana text not null default '',
  sentence_vi text not null,
  sort_order integer not null default 0,
  sync_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  foreign key (user_id, flashcard_id)
    references public.flashcards (user_id, id)
    on delete cascade
);

create index if not exists idx_flashcard_examples_user_card_active
  on public.flashcard_examples (user_id, flashcard_id, deleted_at, sort_order);

create index if not exists idx_flashcard_examples_user_compound_active
  on public.flashcard_examples (user_id, compound_word_id, deleted_at);

alter table public.flashcard_examples enable row level security;

drop policy if exists "Examples: user owns all operations" on public.flashcard_examples;
create policy "Examples: user owns all operations"
  on public.flashcard_examples for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Explicit Grants
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on table public.flashcard_examples to postgres, service_role;
grant select, insert, update, delete on table public.flashcard_examples to authenticated;
