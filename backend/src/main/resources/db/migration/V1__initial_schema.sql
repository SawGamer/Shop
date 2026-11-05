-- Z&A Shop initial schema.
-- Tables are grouped by application module. Modules do not reference each other's tables with
-- foreign keys, so a module can later move to its own database without untangling constraints.

-- ───────────────────────────── identity ─────────────────────────────
create table users (
    id             uuid primary key,
    email          varchar(254) not null unique, -- stored lower-cased
    password_hash  varchar(100) not null,
    first_name     varchar(60)  not null,
    last_name      varchar(60)  not null,
    email_verified boolean      not null default false,
    created_at     timestamptz  not null,
    updated_at     timestamptz  not null,
    version        bigint       not null default 0
);

create table user_roles (
    user_id uuid        not null references users (id) on delete cascade,
    role    varchar(20) not null,
    primary key (user_id, role)
);

create table refresh_tokens (
    id          uuid primary key,
    user_id     uuid         not null references users (id) on delete cascade,
    token_hash  varchar(64)  not null unique, -- SHA-256 hex, the raw token is never stored
    family_id   uuid         not null,        -- all rotations of one login share a family
    expires_at  timestamptz  not null,
    created_at  timestamptz  not null,
    revoked_at  timestamptz
);
create index refresh_tokens_user_idx on refresh_tokens (user_id);
create index refresh_tokens_family_idx on refresh_tokens (family_id);

create table email_verification_tokens (
    token_hash varchar(64) primary key,
    user_id    uuid        not null references users (id) on delete cascade,
    expires_at timestamptz not null,
    used_at    timestamptz
);

-- ───────────────────────────── catalog ─────────────────────────────
create table brands (
    id         uuid primary key,
    slug       varchar(80) not null unique,
    name       varchar(80) not null,
    created_at timestamptz not null
);

create table categories (
    id         uuid primary key,
    slug       varchar(80) not null unique,
    name       varchar(80) not null,
    parent_id  uuid references categories (id) on delete restrict,
    position   integer     not null default 0,
    created_at timestamptz not null
);
create index categories_parent_idx on categories (parent_id);

create table products (
    id          uuid primary key,
    slug        varchar(160) not null unique,
    name        varchar(160) not null,
    description text         not null default '',
    brand_id    uuid         not null references brands (id),
    status      varchar(16)  not null,
    created_at  timestamptz  not null,
    updated_at  timestamptz  not null,
    version     bigint       not null default 0
);
create index products_brand_idx on products (brand_id);
create index products_status_created_idx on products (status, created_at desc);

create table product_categories (
    product_id  uuid not null references products (id) on delete cascade,
    category_id uuid not null references categories (id) on delete cascade,
    primary key (product_id, category_id)
);
create index product_categories_category_idx on product_categories (category_id);

create table product_variants (
    id                     uuid primary key,
    product_id             uuid        not null references products (id) on delete cascade,
    sku                    varchar(64) not null unique,
    size                   varchar(20),
    color                  varchar(40),
    price_cents            bigint      not null check (price_cents >= 0),
    compare_at_price_cents bigint check (compare_at_price_cents is null or compare_at_price_cents >= 0),
    position               integer     not null default 0,
    created_at             timestamptz not null
);
create index product_variants_product_idx on product_variants (product_id);

create table product_images (
    id          uuid primary key,
    product_id  uuid         not null references products (id) on delete cascade,
    storage_key varchar(300) not null,
    url         varchar(600) not null,
    alt         varchar(200),
    position    integer      not null default 0,
    created_at  timestamptz  not null
);
create index product_images_product_idx on product_images (product_id);

-- ───────────────────────────── inventory ─────────────────────────────
-- Availability = on_hand - reserved. Reservations are taken with a single conditional UPDATE,
-- so concurrent checkouts can never oversell, without any application level locking.
create table inventory_items (
    variant_id uuid primary key,
    on_hand    integer     not null check (on_hand >= 0),
    reserved   integer     not null default 0 check (reserved >= 0),
    updated_at timestamptz not null,
    constraint inventory_reserved_le_on_hand check (reserved <= on_hand)
);

create table stock_reservations (
    id         uuid primary key,
    order_id   uuid        not null,
    variant_id uuid        not null,
    quantity   integer     not null check (quantity > 0),
    status     varchar(16) not null, -- RESERVED | COMMITTED | RELEASED
    created_at timestamptz not null,
    updated_at timestamptz not null
);
create index stock_reservations_order_idx on stock_reservations (order_id);

-- ───────────────────────────── orders ─────────────────────────────
create sequence order_number_seq start with 100001;

create table orders (
    id                 uuid primary key,
    order_number       varchar(20)  not null unique,
    user_id            uuid         not null,
    customer_email     varchar(254) not null,
    status             varchar(20)  not null,
    currency           varchar(3)   not null,
    subtotal_cents     bigint       not null,
    shipping_cents     bigint       not null,
    total_cents        bigint       not null,
    ship_full_name     varchar(120) not null,
    ship_line1         varchar(160) not null,
    ship_line2         varchar(160),
    ship_postal_code   varchar(20)  not null,
    ship_city          varchar(80)  not null,
    ship_country       varchar(2)   not null,
    ship_phone         varchar(40),
    payment_session_id uuid,
    payment_url        varchar(1000),
    created_at         timestamptz  not null,
    updated_at         timestamptz  not null,
    expires_at         timestamptz  not null,
    paid_at            timestamptz,
    shipped_at         timestamptz,
    delivered_at       timestamptz,
    cancelled_at       timestamptz,
    version            bigint       not null default 0
);
create index orders_user_created_idx on orders (user_id, created_at desc);
create index orders_status_created_idx on orders (status, created_at desc);
create index orders_pending_expiry_idx on orders (expires_at) where status = 'PENDING_PAYMENT';

create table order_lines (
    id               uuid primary key,
    order_id         uuid         not null references orders (id) on delete cascade,
    position         integer      not null,
    variant_id       uuid         not null,
    product_id       uuid         not null,
    product_slug     varchar(160) not null,
    product_name     varchar(160) not null,
    sku              varchar(64)  not null,
    size             varchar(20),
    color            varchar(40),
    image_url        varchar(600),
    unit_price_cents bigint       not null,
    quantity         integer      not null check (quantity > 0),
    line_total_cents bigint       not null
);
create index order_lines_order_idx on order_lines (order_id);

-- ───────────────────────────── payments ─────────────────────────────
create table payment_sessions (
    id                  uuid primary key,
    order_id            uuid         not null,
    user_id             uuid         not null,
    provider            varchar(16)  not null, -- stripe | fake
    provider_session_id varchar(255),
    status              varchar(16)  not null, -- OPEN | SUCCEEDED | EXPIRED | CANCELLED
    amount_cents        bigint       not null,
    currency            varchar(3)   not null,
    payment_url         varchar(1000),
    created_at          timestamptz  not null,
    updated_at          timestamptz  not null,
    version             bigint       not null default 0
);
create index payment_sessions_order_idx on payment_sessions (order_id);
create unique index payment_sessions_provider_session_uq on payment_sessions (provider, provider_session_id);

create table processed_webhook_events (
    event_id     varchar(255) primary key,
    provider     varchar(16)  not null,
    processed_at timestamptz  not null
);

-- ──────────────── Spring Modulith event publication registry (transactional outbox) ────────────────
create table event_publication (
    id                     uuid                     not null primary key,
    listener_id            text                     not null,
    event_type             text                     not null,
    serialized_event       text                     not null,
    publication_date       timestamp with time zone not null,
    completion_date        timestamp with time zone,
    status                 text,
    completion_attempts    int,
    last_resubmission_date timestamp with time zone
);
create index event_publication_serialized_event_hash_idx on event_publication using hash (serialized_event);
create index event_publication_by_completion_date_idx on event_publication (completion_date);
