-- Local fulfillment: delivery zones, pickup stores, a slot schedule and slot capacity counters.

alter table shop_settings add column fulfillment_mode varchar(16) not null default 'SHIPPING';

create table fulfillment_zones (
    id               uuid primary key,
    name             varchar(80) not null,
    fee_cents        bigint      not null check (fee_cents >= 0),
    free_from_cents  bigint check (free_from_cents is null or free_from_cents >= 0),
    min_order_cents  bigint      not null default 0 check (min_order_cents >= 0),
    created_at       timestamptz not null
);

create table fulfillment_zone_prefixes (
    zone_id uuid        not null references fulfillment_zones (id) on delete cascade,
    prefix  varchar(10) not null,
    primary key (zone_id, prefix)
);

create table fulfillment_locations (
    id            uuid primary key,
    name          varchar(80)  not null,
    line1         varchar(160) not null,
    line2         varchar(160),
    postal_code   varchar(20)  not null,
    city          varchar(80)  not null,
    country       varchar(2)   not null,
    phone         varchar(40),
    opening_hours varchar(300) not null default '',
    created_at    timestamptz  not null
);

create table fulfillment_schedule (
    id                  smallint primary key check (id = 1),
    slot_minutes        integer not null check (slot_minutes between 30 and 240),
    capacity_per_slot   integer not null check (capacity_per_slot between 1 and 500),
    lead_time_minutes   integer not null check (lead_time_minutes >= 0),
    horizon_days        integer not null check (horizon_days between 1 and 14)
);

create table fulfillment_opening_hours (
    schedule_id smallint not null references fulfillment_schedule (id) on delete cascade,
    day_of_week integer  not null check (day_of_week between 1 and 7),
    from_time   time     not null,
    to_time     time     not null,
    check (to_time > from_time)
);

-- One counter per bookable slot. Booking is a single conditional upsert, so slots cannot be overbooked.
-- Keys: "D|<epoch>" for deliveries and "P|<locationId>|<epoch>" for pickups.
create table slot_counters (
    slot_key varchar(120) primary key,
    booked   integer not null check (booked >= 0)
);

alter table orders
    add column fulfillment_method   varchar(16),
    add column fulfillment_slot_key varchar(120),
    add column slot_starts_at       timestamptz,
    add column slot_ends_at         timestamptz,
    add column fulfillment_label    varchar(120);
