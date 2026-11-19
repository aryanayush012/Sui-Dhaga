-- Sui-Dhaga v1 schema. Every shop-owned table carries shop_id; RLS on everything.
-- Logged-in users only SELECT (plus owner update of a few shop columns);
-- all other writes go through security definer RPCs.

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  address text,
  logo_url text,
  language text not null default 'hi' check (language in ('hi', 'en')),
  slip_counter int not null default 0,
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key references auth.users on delete cascade,
  shop_id uuid not null references shops,
  name text not null check (btrim(name) <> ''),
  mobile text not null unique check (mobile ~ '^[6-9][0-9]{9}$'),
  role text not null check (role in ('owner', 'employee')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, shop_id)
);
create index on members (shop_id);

create table stages (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops,
  name text not null,
  position int not null,
  unique (shop_id, position),
  unique (id, shop_id)
);

-- Composite (x_id, shop_id) foreign keys make cross-shop references impossible at the DB level.
create table orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops,
  slip_no int not null,
  customer_name text not null,
  customer_mobile text not null check (customer_mobile ~ '^[6-9][0-9]{9}$'),
  due_date date not null,
  stage_id uuid not null,
  special_state text check (special_state in ('on_hold', 'cancelled', 'delivered')),
  rack text,
  assignee_id uuid,
  total_amount int check (total_amount >= 0),
  notes text,
  tracking_token text not null unique,
  tracking_enabled boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, slip_no),
  unique (id, shop_id),
  foreign key (stage_id, shop_id) references stages (id, shop_id),
  foreign key (assignee_id, shop_id) references members (id, shop_id),
  foreign key (created_by, shop_id) references members (id, shop_id)
);
create index on orders (shop_id, due_date);

create table garments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops,
  order_id uuid not null,
  type text not null check (type in ('pant', 'shirt', 'suit', 'blouse', 'other')),
  qty int not null default 1 check (qty >= 1),
  cloth_photo_path text,
  measurement_photo_path text,
  measurements jsonb not null default '{}',
  instructions text,
  foreign key (order_id, shop_id) references orders (id, shop_id) on delete cascade
);
create index on garments (order_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops,
  order_id uuid not null,
  amount int not null check (amount <> 0),
  method text not null check (method in ('cash', 'upi', 'other')),
  note text,
  recorded_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key (order_id, shop_id) references orders (id, shop_id),
  foreign key (recorded_by, shop_id) references members (id, shop_id)
);
create index on payments (order_id);

create table order_events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops,
  order_id uuid not null,
  action text not null,
  from_value text,
  to_value text,
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (order_id, shop_id) references orders (id, shop_id),
  foreign key (actor_id, shop_id) references members (id, shop_id)
);
create index on order_events (order_id);

create table whatsapp_sends (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops,
  order_id uuid not null,
  kind text not null check (kind in ('created', 'date_changed', 'ready')),
  opened_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key (order_id, shop_id) references orders (id, shop_id),
  foreign key (opened_by, shop_id) references members (id, shop_id)
);
create index on whatsapp_sends (order_id);

-- ---------- privileges ----------
-- Supabase grants ALL on public tables to anon/authenticated by default. Strip that,
-- for these tables and for tables later migrations create.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from authenticated;
grant select on shops, members, stages, orders, garments, payments, order_events, whatsapp_sends to authenticated;
grant update (name, address, logo_url, language) on shops to authenticated;

-- ---------- helpers ----------
create function current_member() returns members
language sql stable security definer set search_path = public as $$
  select * from members where id = auth.uid() and is_active
$$;

create function current_shop_id() returns uuid
language sql stable security definer set search_path = public as $$
  select (current_member()).shop_id
$$;

create function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((current_member()).role = 'owner', false)
$$;

revoke execute on function current_member(), current_shop_id(), is_owner() from public, anon;
grant execute on function current_member(), current_shop_id(), is_owner() to authenticated;

-- ---------- RLS ----------
alter table shops enable row level security;
alter table members enable row level security;
alter table stages enable row level security;
alter table orders enable row level security;
alter table garments enable row level security;
alter table payments enable row level security;
alter table order_events enable row level security;
alter table whatsapp_sends enable row level security;

-- (select fn()) lets Postgres evaluate the helper once per statement, not per row.
create policy shops_read on shops for select to authenticated
  using (id = (select current_shop_id()));
create policy shops_owner_update on shops for update to authenticated
  using (id = (select current_shop_id()) and (select is_owner()))
  with check (id = (select current_shop_id()) and (select is_owner()));

create policy members_read on members for select to authenticated
  using (shop_id = (select current_shop_id()));
create policy stages_read on stages for select to authenticated
  using (shop_id = (select current_shop_id()));
create policy garments_read on garments for select to authenticated
  using (shop_id = (select current_shop_id()));
create policy order_events_read on order_events for select to authenticated
  using (shop_id = (select current_shop_id()));

-- Employees never read these directly (orders via board_orders view, later).
create policy orders_owner_read on orders for select to authenticated
  using (shop_id = (select current_shop_id()) and (select is_owner()));
create policy payments_owner_read on payments for select to authenticated
  using (shop_id = (select current_shop_id()) and (select is_owner()));
create policy whatsapp_sends_owner_read on whatsapp_sends for select to authenticated
  using (shop_id = (select current_shop_id()) and (select is_owner()));

-- ---------- RPCs ----------
create function admin_create_shop(p_name text, p_owner_id uuid, p_owner_name text, p_mobile text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_shop uuid;
begin
  if p_mobile is null or p_mobile !~ '^[6-9][0-9]{9}$' then raise exception 'invalid_mobile'; end if;
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_owner_name), '') = '' or p_owner_id is null then
    raise exception 'invalid_input';
  end if;
  insert into shops (name) values (btrim(p_name)) returning id into v_shop;
  insert into members (id, shop_id, name, mobile, role)
    values (p_owner_id, v_shop, btrim(p_owner_name), p_mobile, 'owner');
  insert into stages (shop_id, name, position)
    select v_shop, s.name, s.pos
    from unnest(array['Cutting', 'Stitching', 'Ironing', 'Ready']) with ordinality as s(name, pos);
  return v_shop;
end $$;
revoke execute on function admin_create_shop(text, uuid, text, text) from public, anon, authenticated;
grant execute on function admin_create_shop(text, uuid, text, text) to service_role;

create function set_member_active(p_member_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members := current_member();
begin
  if me.id is null then raise exception 'not_member'; end if;
  if me.role <> 'owner' then raise exception 'not_owner'; end if;
  if p_member_id = me.id or p_active is null then raise exception 'forbidden'; end if;
  update members set is_active = p_active where id = p_member_id and shop_id = me.shop_id;
  if not found then raise exception 'forbidden'; end if;
end $$;
revoke execute on function set_member_active(uuid, boolean) from public, anon;
grant execute on function set_member_active(uuid, boolean) to authenticated;
