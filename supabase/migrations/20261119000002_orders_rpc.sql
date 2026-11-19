-- Order write paths (security definer RPCs) and the board_orders read model.

-- ---------- internal helpers (not callable by clients) ----------

-- Locks an order of the caller's shop for writing and enforces who may write it.
-- Employees may only touch orders assigned to them or unassigned.
create function _order_for_write(p_order_id uuid, p_owner_only boolean) returns orders
language plpgsql security definer set search_path = public as $$
declare
  me members := current_member();
  o orders;
begin
  if me.id is null then raise exception 'not_member'; end if;
  if p_owner_only and me.role <> 'owner' then raise exception 'not_owner'; end if;
  select * into o from orders where id = p_order_id and shop_id = me.shop_id for update;
  if not found then raise exception 'not_found'; end if;
  if me.role <> 'owner' and o.assignee_id is not null and o.assignee_id <> me.id then
    raise exception 'forbidden';
  end if;
  return o;
end $$;

-- Writes the activity row and bumps updated_at. Never pass customer mobiles here:
-- order_events is readable by employees.
create function _log_event(o orders, p_action text, p_from text, p_to text) returns void
language sql security definer set search_path = public as $$
  -- clock_timestamp keeps events of one transaction (created, payment) in order.
  insert into order_events (shop_id, order_id, action, from_value, to_value, actor_id, created_at)
    values (o.shop_id, o.id, p_action, p_from, p_to, auth.uid(), clock_timestamp());
  update orders set updated_at = now() where id = o.id;
$$;

-- Validates a garment payload and returns it as a garments row (id/shop/order unset).
create function _garment_from_json(p jsonb) returns garments
language plpgsql immutable set search_path = public as $$
declare
  g garments;
begin
  if jsonb_typeof(p) is distinct from 'object'
     or coalesce(p->>'type', '') not in ('pant', 'shirt', 'suit', 'blouse', 'other')
     or coalesce(jsonb_typeof(p->'measurements'), 'object') <> 'object' then
    raise exception 'invalid_input';
  end if;
  g.type := p->>'type';
  g.qty := coalesce((p->>'qty')::int, 1);
  if g.qty < 1 then raise exception 'invalid_input'; end if;
  g.cloth_photo_path := nullif(btrim(p->>'cloth_photo_path'), '');
  g.measurement_photo_path := nullif(btrim(p->>'measurement_photo_path'), '');
  g.measurements := coalesce(p->'measurements', '{}');
  g.instructions := nullif(btrim(p->>'instructions'), '');
  return g;
end $$;

-- ---------- create ----------
create function create_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me members := current_member();
  o orders;
  g garments;
  item jsonb;
  v_adv int;
begin
  if me.id is null then raise exception 'not_member'; end if;
  if me.role <> 'owner' then raise exception 'not_owner'; end if;
  if coalesce(p->>'customer_mobile', '') !~ '^[6-9][0-9]{9}$' then raise exception 'invalid_mobile'; end if;
  if coalesce(btrim(p->>'customer_name'), '') = '' or p->>'due_date' is null
     or jsonb_typeof(p->'garments') is distinct from 'array' or jsonb_array_length(p->'garments') = 0 then
    raise exception 'invalid_input';
  end if;

  o.assignee_id := (p->>'assignee_id')::uuid;
  if o.assignee_id is not null and not exists (
    select 1 from members where id = o.assignee_id and shop_id = me.shop_id and is_active
  ) then raise exception 'invalid_input'; end if;

  o.total_amount := (p->>'total_amount')::int;
  if o.total_amount < 0 then raise exception 'invalid_input'; end if;
  if jsonb_typeof(p->'advance') = 'object' then
    v_adv := (p->'advance'->>'amount')::int;
    if coalesce(v_adv, 0) <= 0 or coalesce(p->'advance'->>'method', '') not in ('cash', 'upi', 'other') then
      raise exception 'invalid_input';
    end if;
    if v_adv > o.total_amount then raise exception 'exceeds_total'; end if;
  end if;

  -- Row lock on the shop serialises concurrent creates.
  update shops set slip_counter = slip_counter + 1 where id = me.shop_id returning slip_counter into o.slip_no;

  insert into orders (shop_id, slip_no, customer_name, customer_mobile, due_date, stage_id,
                      rack, assignee_id, total_amount, notes, tracking_token, created_by)
  values (me.shop_id, o.slip_no, btrim(p->>'customer_name'), p->>'customer_mobile', (p->>'due_date')::date,
          (select id from stages where shop_id = me.shop_id order by position limit 1),
          nullif(btrim(p->>'rack'), ''), o.assignee_id, o.total_amount, nullif(btrim(p->>'notes'), ''),
          translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), me.id)
  returning * into o;

  for item in select * from jsonb_array_elements(p->'garments') loop
    g := _garment_from_json(item);
    insert into garments (shop_id, order_id, type, qty, cloth_photo_path, measurement_photo_path, measurements, instructions)
      values (me.shop_id, o.id, g.type, g.qty, g.cloth_photo_path, g.measurement_photo_path, g.measurements, g.instructions);
  end loop;

  perform _log_event(o, 'created', null, o.slip_no::text);
  if v_adv is not null then
    insert into payments (shop_id, order_id, amount, method, note, recorded_by)
      values (me.shop_id, o.id, v_adv, p->'advance'->>'method', 'advance', me.id);
    perform _log_event(o, 'payment', null, v_adv::text);
  end if;

  return jsonb_build_object('id', o.id, 'slip_no', o.slip_no, 'tracking_token', o.tracking_token);
end $$;

-- ---------- mutations ----------
create function move_order(p_order_id uuid, p_stage_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, false);
begin
  if o.special_state is not null then raise exception 'order_closed'; end if;
  if not exists (select 1 from stages where id = p_stage_id and shop_id = o.shop_id) then
    raise exception 'invalid_input';
  end if;
  update orders set stage_id = p_stage_id where id = o.id;
  perform _log_event(o, 'stage', o.stage_id::text, p_stage_id::text);
end $$;

create function set_rack(p_order_id uuid, p_rack text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, false);
  v_rack text := nullif(btrim(p_rack), '');
begin
  update orders set rack = v_rack where id = o.id;
  perform _log_event(o, 'rack', o.rack, v_rack);
end $$;

create function assign_order(p_order_id uuid, p_member_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
begin
  if p_member_id is not null and not exists (
    select 1 from members where id = p_member_id and shop_id = o.shop_id and is_active
  ) then raise exception 'invalid_input'; end if;
  update orders set assignee_id = p_member_id where id = o.id;
  perform _log_event(o, 'assignee', o.assignee_id::text, p_member_id::text);
end $$;

create function change_due_date(p_order_id uuid, p_due date) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
begin
  if p_due is null then raise exception 'invalid_input'; end if;
  update orders set due_date = p_due where id = o.id;
  perform _log_event(o, 'due_date', o.due_date::text, p_due::text);
end $$;

create function set_special_state(p_order_id uuid, p_state text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
begin
  if p_state is not null and p_state not in ('on_hold', 'cancelled', 'delivered') then
    raise exception 'invalid_input';
  end if;
  update orders set special_state = p_state where id = o.id;
  perform _log_event(o, 'special_state', o.special_state, p_state);
end $$;

-- Logs which fields changed, never their values (mobile must not reach order_events).
create function update_order_info(p_order_id uuid, p_name text, p_mobile text, p_notes text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
  v_name text := btrim(p_name);
  v_notes text := nullif(btrim(p_notes), '');
begin
  if coalesce(p_mobile, '') !~ '^[6-9][0-9]{9}$' then raise exception 'invalid_mobile'; end if;
  if coalesce(v_name, '') = '' then raise exception 'invalid_input'; end if;
  update orders set customer_name = v_name, customer_mobile = p_mobile, notes = v_notes where id = o.id;
  perform _log_event(o, 'info', null, nullif(concat_ws(',',
    case when v_name <> o.customer_name then 'name' end,
    case when p_mobile <> o.customer_mobile then 'mobile' end,
    case when v_notes is distinct from o.notes then 'notes' end), ''));
end $$;

-- Inserts (no p.id) or updates (p.id) a garment of the order; returns its id.
create function save_garment(p_order_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
  g garments := _garment_from_json(p);
  v_id uuid := (p->>'id')::uuid;
begin
  if v_id is null then
    insert into garments (shop_id, order_id, type, qty, cloth_photo_path, measurement_photo_path, measurements, instructions)
      values (o.shop_id, o.id, g.type, g.qty, g.cloth_photo_path, g.measurement_photo_path, g.measurements, g.instructions)
      returning id into v_id;
  else
    update garments set type = g.type, qty = g.qty, cloth_photo_path = g.cloth_photo_path,
      measurement_photo_path = g.measurement_photo_path, measurements = g.measurements, instructions = g.instructions
    where id = v_id and order_id = o.id;
    if not found then raise exception 'not_found'; end if;
  end if;
  perform _log_event(o, 'garment', null, g.type);
  return v_id;
end $$;

create function delete_garment(p_garment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  g garments;
  o orders;
begin
  if current_shop_id() is null then raise exception 'not_member'; end if;
  select * into g from garments where id = p_garment_id and shop_id = current_shop_id();
  if not found then raise exception 'not_found'; end if;
  o := _order_for_write(g.order_id, true);  -- locks the order, so the count below is race-free
  if (select count(*) from garments where order_id = o.id) <= 1 then raise exception 'invalid_input'; end if;
  delete from garments where id = g.id;
  perform _log_event(o, 'garment', g.type, null);
end $$;

-- ---------- privileges ----------
revoke execute on function _order_for_write(uuid, boolean), _log_event(orders, text, text, text),
  _garment_from_json(jsonb) from public, anon, authenticated;
revoke execute on function create_order(jsonb), move_order(uuid, uuid), set_rack(uuid, text),
  assign_order(uuid, uuid), change_due_date(uuid, date), set_special_state(uuid, text),
  update_order_info(uuid, text, text, text), save_garment(uuid, jsonb), delete_garment(uuid) from public, anon;
grant execute on function create_order(jsonb), move_order(uuid, uuid), set_rack(uuid, text),
  assign_order(uuid, uuid), change_due_date(uuid, date), set_special_state(uuid, text),
  update_order_info(uuid, text, text, text), save_garment(uuid, jsonb), delete_garment(uuid) to authenticated;

-- ---------- board_orders ----------
-- Definer view (bypasses orders RLS so employees can read it); it scopes itself to the
-- caller's shop and hides customer mobile + tracking token from non-owners.
create view board_orders as
select
  o.id, o.slip_no, o.customer_name,
  case when (select is_owner()) then o.customer_mobile end as customer_mobile,
  o.due_date, o.stage_id, s.name as stage_name, s.position as stage_position,
  s.position = (select max(position) from stages where shop_id = o.shop_id) as is_ready,
  o.special_state, o.rack, o.assignee_id, m.name as assignee_name, o.total_amount,
  coalesce((select sum(amount) from payments where order_id = o.id), 0)::int as paid_amount,
  coalesce((select string_agg(t.qty || ' ' || t.type, ', ' order by t.type)
            from (select type, sum(qty) as qty from garments where order_id = o.id group by type) t), '') as garment_summary,
  case when (select is_owner()) then o.tracking_token end as tracking_token,
  o.tracking_enabled,
  null::text as comm_kind,   -- Task 5
  false as communicated,     -- Task 5
  o.created_at, o.updated_at
from orders o
join stages s on s.id = o.stage_id
left join members m on m.id = o.assignee_id
where o.shop_id = (select current_shop_id());

revoke all on board_orders from public, anon, authenticated;
grant select on board_orders to authenticated;
