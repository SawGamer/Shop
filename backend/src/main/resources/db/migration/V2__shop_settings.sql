-- ───────────────────────────── settings ─────────────────────────────
-- One row describing the shop and which storefront design it uses.
create table shop_settings (
    id           smallint primary key check (id = 1),
    name         varchar(80)  not null,
    tagline      varchar(160),
    theme        varchar(32)  not null,
    accent_color varchar(7),
    logo_key     varchar(300),
    logo_url     varchar(600),
    updated_at   timestamptz  not null,
    version      bigint       not null default 0
);
