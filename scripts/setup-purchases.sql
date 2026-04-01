-- Purchases table — tracks all paid access
create table if not exists purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  product_id text not null,
  stripe_session_id text,
  stripe_payment_intent text,
  amount integer,
  currency text default 'usd',
  status text default 'pending', -- pending, completed, refunded, promo
  created_at timestamptz default now()
);

create index if not exists idx_purchases_user on purchases(user_id);
create index if not exists idx_purchases_product on purchases(user_id, product_id);

-- Promo codes table
create table if not exists promo_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  product_id text not null, -- 'core-assessment', 'maskulinity', etc.
  max_uses integer default 1,
  current_uses integer default 0,
  expires_at timestamptz,
  created_by text, -- admin who created it
  created_at timestamptz default now()
);

create index if not exists idx_promo_code on promo_codes(code);

-- Add passkey_hashed flag to users table for migration
alter table users add column if not exists passkey_hashed boolean default false;
