create table if not exists column_semantics (
    id bigserial primary key,
    domain text not null,
    table_name text not null,
    column_name text not null,
    semantic_type text not null,
    metadata text default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint uq_column_semantics unique (table_name, column_name)
);

create index if not exists idx_column_semantics_domain on column_semantics(domain);
create index if not exists idx_column_semantics_semantic_type on column_semantics(semantic_type);
