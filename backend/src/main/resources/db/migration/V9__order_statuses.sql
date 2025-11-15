create table if not exists order_statuses (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null unique,
    display_order integer not null default 0,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

insert into order_statuses (name, display_order)
values
    ('New', 1),
    ('Pending Confirmation', 2),
    ('Confirmed', 3),
    ('Shipped', 4),
    ('Delivered', 5),
    ('Returned', 6),
    ('Canceled', 7)
on conflict (name) do nothing;
