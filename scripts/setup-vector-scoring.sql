-- Vector Scoring System — Type Signatures & Shadow Mode
-- Run in Supabase SQL Editor (safe to re-run: all IF NOT EXISTS)

-- Type signatures: per-question embeddings for each Enneagram type
-- Used by the vector scorer to match user responses against known type patterns
create table if not exists type_signatures (
  id uuid primary key default gen_random_uuid(),
  type_id int not null check (type_id between 1 and 9),
  question_id text not null,
  exemplar_responses text[],
  mean_embedding vector(1536),
  sample_count int default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(type_id, question_id)
);

create index if not exists type_signatures_type_idx on type_signatures (type_id);
create index if not exists type_signatures_question_idx on type_signatures (question_id);

-- Type centroids: aggregate vector per type (mean of all that type's response embeddings)
create table if not exists type_centroids (
  type_id int primary key check (type_id between 1 and 9),
  center text not null check (center in ('head', 'heart', 'body')),
  centroid_vector vector(1536),
  sample_count int default 0,
  updated_at timestamptz default now()
);

-- Shadow mode logs: compare vector scorer vs Claude during validation phase
create table if not exists shadow_mode_log (
  id bigserial primary key,
  session_id text not null,
  exchange_number int not null,
  claude_top_type int,
  claude_confidence float8,
  vector_top_type int,
  vector_confidence float8,
  vector_center_scores jsonb default '{}',
  vector_type_scores jsonb default '{}',
  agreement boolean,
  center_agreement boolean,
  phase text default 'center_id',
  created_at timestamptz default now()
);

create index if not exists shadow_mode_log_session_idx on shadow_mode_log (session_id);
create index if not exists shadow_mode_log_agreement_idx on shadow_mode_log (agreement);

-- Question effectiveness tracking (populated by batch test script)
create table if not exists question_effectiveness (
  question_id text primary key,
  mean_info_gain float8 default 0,
  center_discrimination float8 default 0,
  type_discrimination jsonb default '{}',
  phase_suitability text[] default '{}',
  response_variance float8 default 0,
  sample_count int default 0,
  last_tested timestamptz,
  is_active boolean default true
);

-- RPC: match type signatures by embedding similarity
create or replace function match_type_signatures(
  query_embedding vector(1536),
  p_question_id text
)
returns table (
  type_id int,
  similarity float8
)
language sql stable
as $$
  select
    ts.type_id,
    1 - (ts.mean_embedding <=> query_embedding) as similarity
  from type_signatures ts
  where ts.question_id = p_question_id
    and ts.mean_embedding is not null
  order by similarity desc;
$$;

-- RPC: match against type centroids (question-agnostic)
create or replace function match_type_centroids(
  query_embedding vector(1536)
)
returns table (
  type_id int,
  center text,
  similarity float8
)
language sql stable
as $$
  select
    tc.type_id,
    tc.center,
    1 - (tc.centroid_vector <=> query_embedding) as similarity
  from type_centroids tc
  where tc.centroid_vector is not null
  order by similarity desc;
$$;
