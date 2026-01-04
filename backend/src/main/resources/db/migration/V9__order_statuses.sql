create table if not exists order_statuses (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null unique,
    display_order integer not null default 0,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

insert into order_statuses (name, display_order)
values
    ('new', 1),
    ('pending_confirmation', 2),
    ('confirmer', 3),
    ('envoyer', 4),
    ('livrer', 5),
    ('reporter', 6),
    ('annuler', 7),
    ('retour', 8),
    ('nrp', 9),
    ('nrp_3', 10),
    ('nrp_2', 11),
    ('saisie', 12),
    ('double', 13),
    ('whatsapp', 14),
    ('erreur_numero', 15)
on conflict (name) do nothing;
