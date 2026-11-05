-- Product specifications (shown as a table and used as search filters) and time-limited deals.

create table product_specs (
    id          uuid primary key,
    product_id  uuid         not null references products (id) on delete cascade,
    position    integer      not null,
    spec_key    varchar(60)  not null, -- snake_case id derived from the label, e.g. screen_size
    spec_group  varchar(60),
    label       varchar(80)  not null,
    spec_value  varchar(200) not null,
    filterable  boolean      not null default false,
    unique (product_id, spec_key)
);
create index product_specs_product_idx on product_specs (product_id);

-- One deal per product: a percentage off every variant between two instants.
alter table products
    add column deal_percent_off integer check (deal_percent_off between 1 and 90),
    add column deal_starts_at   timestamptz,
    add column deal_ends_at     timestamptz,
    add constraint products_deal_complete check (
        (deal_percent_off is null and deal_starts_at is null and deal_ends_at is null)
        or (deal_percent_off is not null and deal_starts_at is not null and deal_ends_at is not null
            and deal_ends_at > deal_starts_at));
create index products_deal_starts_idx on products (deal_starts_at) where deal_starts_at is not null;
create index products_deal_ends_idx on products (deal_ends_at) where deal_ends_at is not null;
