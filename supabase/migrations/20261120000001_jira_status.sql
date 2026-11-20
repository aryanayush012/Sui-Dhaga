-- Jira-style rework: Unstarted first stage, on_hold removed, set_status + set_paid.

-- ---------- Unstarted stage for every existing shop ----------
-- Two steps keep unique(shop_id, position) satisfied mid-update.
update stages set position = position + 100;
update stages set position = position - 99;
insert into stages (shop_id, name, position) select id, 'Unstarted', 1 from shops;

create or replace function admin_create_shop(p_name text, p_owner_id uuid, p_owner_name text, p_mobile text)
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
    from unnest(array['Unstarted', 'Cutting', 'Stitching', 'Ironing', 'Ready']) with ordinality as s(name, pos);
  return v_shop;
end $$;
revoke execute on function admin_create_shop(text, uuid, text, text) from public, anon, authenticated;
grant execute on function admin_create_shop(text, uuid, text, text) to service_role;

-- ---------- on_hold removed: resume held orders ----------
-- System-made change, so the event has no actor.
alter table order_events alter column actor_id drop not null;
insert into order_events (shop_id, order_id, action, from_value, to_value, actor_id)
  select shop_id, id, 'special_state', 'on_hold', null, null from orders where special_state = 'on_hold';
update orders set special_state = null, updated_at = now() where special_state = 'on_hold';
alter table orders drop constraint orders_special_state_check;
alter table orders add constraint orders_special_state_check check (special_state in ('cancelled', 'delivered'));

create or replace function set_special_state(p_order_id uuid, p_state text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
begin
  if p_state is not null and p_state not in ('cancelled', 'delivered') then
    raise exception 'invalid_input';
  end if;
  update orders set special_state = p_state where id = o.id;
  perform _log_event(o, 'special_state', o.special_state, p_state);
end $$;

-- Tracking link is always on now (toggle removed from the UI).
update orders set tracking_enabled = true;

-- ---------- set_status: one dropdown for stages and end states ----------
-- p_target is a stage id (as text), 'delivered' or 'cancelled'.
-- Employees: stage targets only, never on a closed order (assignee rule from _order_for_write).
create function set_status(p_order_id uuid, p_target text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, false);
  v_stage uuid;
begin
  if p_target in ('delivered', 'cancelled') then
    if (current_member()).role <> 'owner' then raise exception 'not_owner'; end if;
    if o.special_state is distinct from p_target then
      update orders set special_state = p_target where id = o.id;
      perform _log_event(o, 'special_state', o.special_state, p_target);
    end if;
    return;
  end if;

  -- Text compare: garbage targets become invalid_input rather than a cast error.
  select id into v_stage from stages where shop_id = o.shop_id and id::text = p_target;
  if v_stage is null then raise exception 'invalid_input'; end if;

  if o.special_state is not null then
    if (current_member()).role <> 'owner' then raise exception 'order_closed'; end if;
    update orders set special_state = null where id = o.id;
    perform _log_event(o, 'special_state', o.special_state, null);
  end if;
  if v_stage <> o.stage_id then
    update orders set stage_id = v_stage where id = o.id;
    perform _log_event(o, 'stage', o.stage_id::text, v_stage::text);
  end if;
end $$;

-- ---------- set_paid: set the paid total; appends one delta payment ----------
create function set_paid(p_order_id uuid, p_paid int) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
  v_old int;
begin
  if p_paid is null or p_paid < 0 then raise exception 'invalid_input'; end if;
  select coalesce(sum(amount), 0) into v_old from payments where order_id = o.id;
  if p_paid = v_old then return; end if;
  if o.total_amount is not null and p_paid > o.total_amount then raise exception 'exceeds_total'; end if;
  insert into payments (shop_id, order_id, amount, method, note, recorded_by)
    values (o.shop_id, o.id, p_paid - v_old, 'other', 'Paid ₹' || v_old || ' → ₹' || p_paid, (current_member()).id);
  perform _log_event(o, 'paid', v_old::text, p_paid::text);
end $$;

revoke execute on function set_status(uuid, text), set_paid(uuid, int) from public, anon;
grant execute on function set_status(uuid, text), set_paid(uuid, int) to authenticated;
