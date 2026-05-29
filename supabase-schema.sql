-- AEO Hub — run this in the Supabase SQL editor

create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location text not null default '',
  niche text not null default '',
  website text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists keywords (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  keyword text not null,
  is_active boolean default true,
  source text default 'manual',
  search_volume int default 0,
  created_at timestamptz default now(),
  unique(client_id, keyword)
);

create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  keyword_id uuid references keywords(id) on delete set null,
  platform text not null check (platform in ('reddit', 'quora', 'paa')),
  question_text text not null,
  relevance_score int default 50,
  status text default 'new' check (status in ('new', 'draft', 'posted')),
  source_url text default '',
  meta_info jsonb default '{}',
  draft_answer text default '',
  posted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists client_credentials (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  platform text not null,
  credential_key text not null,
  credential_value text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(client_id, platform, credential_key)
);

-- Open policies for internal tool use (add auth later if needed)
alter table clients enable row level security;
alter table keywords enable row level security;
alter table questions enable row level security;
alter table client_credentials enable row level security;

create policy "allow_all" on clients for all using (true) with check (true);
create policy "allow_all" on keywords for all using (true) with check (true);
create policy "allow_all" on questions for all using (true) with check (true);
create policy "allow_all" on client_credentials for all using (true) with check (true);

create table if not exists blog_posts (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  title text,
  keyword text,
  content text,
  word_count int,
  status text default 'draft',
  inspired_by jsonb default '[]',
  internal_links jsonb default '[]',
  external_links jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table blog_posts disable row level security;

create table if not exists blog_topic_suggestions (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  title text,
  keyword text,
  intent text,
  description text,
  aeo_reason text,
  written boolean default false,
  created_at timestamptz default now()
);
alter table blog_topic_suggestions disable row level security;
