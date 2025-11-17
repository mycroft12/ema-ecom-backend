alter table order_statuses add column if not exists label_en varchar(150);
alter table order_statuses add column if not exists label_fr varchar(150);
update order_statuses set label_en = coalesce(label_en, name), label_fr = coalesce(label_fr, name);
alter table order_statuses alter column label_en set not null;
alter table order_statuses alter column label_fr set not null;
