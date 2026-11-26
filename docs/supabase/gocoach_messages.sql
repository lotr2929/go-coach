-- Go Coach messages (Boon, 26 Nov 2026): the envelope at the top right.
-- Players send a message (with the board position); Claude answers once a day; replies show in the app.
-- Run once in Supabase > SQL Editor (project dlbstuzzfmjawffzhdys). Safe to run again.
-- Like gocoach_saves: no sign-in yet, so each device's private key (gocoach.owner) is its address,
-- the table is closed to the public key, and the app can only use the four functions below.

create table if not exists public.gocoach_messages (
  id         bigint generated always as identity primary key,
  owner      uuid        not null,
  created_at timestamptz not null default now(),
  sender     text        not null check (sender in ('player', 'coach')),
  name       text        check (char_length(name) <= 30),
  body       text        not null check (char_length(body) between 1 and 2000),
  sgf        text        check (char_length(sgf) <= 20000),
  chat       jsonb,
  read_at    timestamptz,                      -- a coach reply: when the player opened it
  handled    boolean     not null default false -- a player message: Claude has dealt with it
);
create index if not exists gocoach_messages_owner on public.gocoach_messages (owner, id);
create index if not exists gocoach_messages_todo on public.gocoach_messages (handled) where sender = 'player' and not handled;

alter table public.gocoach_messages enable row level security; -- no policies: closed to the public key
revoke all on public.gocoach_messages from anon, authenticated;
grant all on public.gocoach_messages to service_role;         -- Claude's daily task

-- Send a message from the app (at most 20 a day per device).
create or replace function public.gocoach_msg_send(p_owner uuid, p_name text, p_body text, p_sgf text, p_chat jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if (select count(*) from gocoach_messages where owner = p_owner and sender = 'player' and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many messages today';
  end if;
  insert into gocoach_messages (owner, sender, name, body, sgf, chat)
  values (p_owner, 'player', left(nullif(trim(p_name), ''), 30), left(trim(p_body), 2000), left(p_sgf, 20000), p_chat)
  returning id into new_id;
  return new_id;
end $$;

-- This device's conversation, oldest first (the last 200).
create or replace function public.gocoach_msg_list(p_owner uuid)
returns table (id bigint, created_at timestamptz, sender text, body text, read_at timestamptz)
language sql security definer set search_path = public as $$
  select * from (
    select m.id, m.created_at, m.sender, m.body, m.read_at from gocoach_messages m
    where m.owner = p_owner order by m.id desc limit 200
  ) t order by t.id;
$$;

-- How many replies are waiting to be opened (the number on the envelope).
create or replace function public.gocoach_msg_unread(p_owner uuid)
returns integer language sql security definer set search_path = public as $$
  select count(*)::integer from gocoach_messages where owner = p_owner and sender = 'coach' and read_at is null;
$$;

-- Mark this device's replies as opened.
create or replace function public.gocoach_msg_seen(p_owner uuid)
returns void language sql security definer set search_path = public as $$
  update gocoach_messages set read_at = now() where owner = p_owner and sender = 'coach' and read_at is null;
$$;

revoke all on function public.gocoach_msg_send(uuid, text, text, text, jsonb) from public;
revoke all on function public.gocoach_msg_list(uuid) from public;
revoke all on function public.gocoach_msg_unread(uuid) from public;
revoke all on function public.gocoach_msg_seen(uuid) from public;
grant execute on function public.gocoach_msg_send(uuid, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.gocoach_msg_list(uuid) to anon, authenticated;
grant execute on function public.gocoach_msg_unread(uuid) to anon, authenticated;
grant execute on function public.gocoach_msg_seen(uuid) to anon, authenticated;
