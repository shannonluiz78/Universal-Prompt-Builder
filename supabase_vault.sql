-- Run in Supabase SQL Editor for a private, authenticated BYOK vault.
-- Do NOT put plaintext keys in this table. Backend encrypts with Fernet first.
create table if not exists public.prompt_builder_api_keys (
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check (provider in ('gemini')),
 encrypted_key text not null,
 updated_at timestamptz not null default now(),
 primary key (user_id, provider)
);
alter table public.prompt_builder_api_keys enable row level security;
-- No browser-side SELECT/INSERT/UPDATE/DELETE policies: service role only.
-- Backend authenticates the Supabase access token before touching this table.
revoke all on public.prompt_builder_api_keys from anon, authenticated;
