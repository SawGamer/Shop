-- Password reset, saved addresses, account deletion and editable content pages.

create table password_reset_tokens (
    token_hash varchar(64) primary key, -- SHA-256 of the emailed token
    user_id    uuid        not null references users (id) on delete cascade,
    created_at timestamptz not null,
    expires_at timestamptz not null,
    used_at    timestamptz
);
create index password_reset_tokens_user_idx on password_reset_tokens (user_id, created_at desc);

create table customer_addresses (
    id          uuid primary key,
    user_id     uuid         not null references users (id) on delete cascade,
    label       varchar(40),
    full_name   varchar(120) not null,
    line1       varchar(160) not null,
    line2       varchar(160),
    postal_code varchar(20)  not null,
    city        varchar(80)  not null,
    country     varchar(2)   not null,
    phone       varchar(40),
    is_default  boolean      not null default false,
    created_at  timestamptz  not null
);
create index customer_addresses_user_idx on customer_addresses (user_id, created_at desc);
create unique index customer_addresses_default_uq on customer_addresses (user_id) where is_default;

alter table users add column deleted_at timestamptz;

create table content_pages (
    slug        varchar(20) primary key,
    title       varchar(120) not null,
    body        text         not null,
    updated_at  timestamptz,
    is_template boolean      not null default true
);
