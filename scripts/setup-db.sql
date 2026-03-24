-- Go to supabase.com → your project → SQL Editor → paste this file → click Run
-- Safe to re-run: all statements use IF NOT EXISTS or CREATE OR REPLACE

-- Enable the pgvector extension
create extension if not exists vector;

-- Create the documents table
create table if not exists documents (
  id bigserial primary key,
  content text not null,
  metadata jsonb default '{}',
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Create ivfflat index for cosine similarity search
create index if not exists documents_embedding_idx
  on documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 ADDITIONS — safe to append after original schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Questions bank table
create table if not exists questions (
  id bigserial primary key,
  question_text text not null,
  answer_options jsonb default '[]',
  format text not null,          -- forced_choice | agree_disagree | scale | frequency | behavioral_anchor | paragraph_select | scenario | open
  stage int not null default 1,  -- 1–7 maps to assessment stages
  oyn_dim text default '',       -- which OYN dimension this probes (who/what/why/how/when/where)
  react_respond_lens text default '', -- 'react' | 'respond' | 'both'
  target_types jsonb default '[]',    -- array of type ints this question discriminates
  times_used int default 0,
  avg_information_yield float8 default 0.5,
  created_at timestamptz default now()
);

create index if not exists questions_stage_idx on questions (stage);
create index if not exists questions_format_idx on questions (format);
create index if not exists questions_yield_idx on questions (avg_information_yield desc);
create index if not exists questions_times_used_idx on questions (times_used asc);
create index if not exists questions_stage_yield_idx on questions (stage, avg_information_yield desc);
create index if not exists questions_stage_format_idx on questions (stage, format);

-- Assessment learnings table (captures systemic weaknesses)
create table if not exists assessment_learnings (
  id bigserial primary key,
  session_id text not null,
  learning_type text not null,   -- 'format_drift' | 'early_close' | 'missed_differentiation' | etc.
  description text not null,
  severity int default 1,        -- 1–3
  created_at timestamptz default now()
);

-- Assessment evaluations table (post-session quality scores)
create table if not exists assessment_evaluations (
  id bigserial primary key,
  session_id text not null unique,
  overall_score float8 not null,
  format_compliance_score float8 default 0,
  differentiation_score float8 default 0,
  closing_criteria_score float8 default 0,
  strengths jsonb default '[]',
  weaknesses jsonb default '[]',
  question_usefulness jsonb default '[]',
  final_type_confidence float8 default 0,
  exchange_count int default 0,
  created_at timestamptz default now()
);

-- RPC: get_candidate_questions
-- Returns up to `p_limit` questions for the given stage, excluding the last format used.
create or replace function get_candidate_questions(
  p_leading_type int default 0,
  p_needs_differentiation text default null,
  p_stage int default 1,
  p_last_format text default '',
  p_limit int default 8
)
returns table (
  id bigint,
  question_text text,
  answer_options jsonb,
  format text,
  stage int,
  oyn_dim text,
  react_respond_lens text,
  target_types jsonb,
  times_used int,
  avg_information_yield float8
)
language sql stable
as $$
  select
    q.id, q.question_text, q.answer_options, q.format,
    q.stage, q.oyn_dim, q.react_respond_lens, q.target_types,
    q.times_used, q.avg_information_yield
  from questions q
  where q.stage = p_stage
    and (p_last_format = '' or q.format != p_last_format)
    and (
      p_leading_type = 0
      or p_leading_type = any(array(select jsonb_array_elements_text(q.target_types)::int))
      or jsonb_array_length(q.target_types) = 0
    )
  order by q.avg_information_yield desc, q.times_used asc
  limit p_limit;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 ADDITIONS — PART 2: assessment_results + admin view
-- Run in Supabase SQL Editor (safe to re-run)
-- ─────────────────────────────────────────────────────────────────────────────

-- Full session outcome (persisted at close, survives server restarts)
create table if not exists assessment_results (
  id                       bigserial primary key,
  session_id               text not null unique,
  leading_type             int not null,
  confidence               float8 not null default 0,
  type_scores              jsonb default '{}',
  variant_signals          jsonb default '{}',
  wing_signals             jsonb default '{}',
  tritype                  text default '',
  tritype_confidence       float8 default 0,
  tritype_archetype_fauvre text default '',
  tritype_archetype_ds     text default '',
  defiant_spirit_type_name text default '',
  whole_type_signals       jsonb default '{}',
  oyn_dimensions           jsonb default '{}',
  defiant_spirit           jsonb default '{}',
  domain_signals           jsonb default '[]',
  supervisor_scores        jsonb default '[]',
  exchange_count           int default 0,
  current_stage            int default 1,
  created_at               timestamptz default now()
);

create index if not exists assessment_results_created_at_idx  on assessment_results (created_at desc);
create index if not exists assessment_results_leading_type_idx on assessment_results (leading_type);
create index if not exists assessment_results_tritype_idx      on assessment_results (tritype);

-- Convenience view for admin dashboard (results + quality scores in one query)
create or replace view admin_session_summary as
  select
    r.session_id,
    r.leading_type,
    r.confidence,
    r.tritype,
    r.tritype_archetype_fauvre,
    r.defiant_spirit_type_name,
    r.exchange_count,
    r.domain_signals,
    r.created_at,
    e.overall_score,
    e.format_compliance_score,
    e.differentiation_score,
    e.closing_criteria_score,
    e.strengths,
    e.weaknesses
  from assessment_results r
  left join assessment_evaluations e on e.session_id = r.session_id
  order by r.created_at desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- ORIGINAL match_documents RPC (unchanged below)
-- ─────────────────────────────────────────────────────────────────────────────

-- Create the match_documents RPC function
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float8 default 0.5,
  match_count int default 5
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float8
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
