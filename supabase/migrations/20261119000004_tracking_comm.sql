-- WhatsApp send records, the "Status communicated" badge, and the public tracking RPC.

-- Owner tapped "Send on WhatsApp" for a trigger. The whatsapp event bumps updated_at
-- (board refresh signal) and logs only the kind, never the mobile.
create function record_whatsapp_send(p_order_id uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
begin
  if coalesce(p_kind, '') not in ('created', 'date_changed', 'ready') then raise exception 'invalid_input'; end if;
  -- clock_timestamp matches _log_event, so sends compare correctly against state-entry events.
  insert into whatsapp_sends (shop_id, order_id, kind, opened_by, created_at)
    values (o.shop_id, o.id, p_kind, (current_member()).id, clock_timestamp());
  perform _log_event(o, 'whatsapp', null, p_kind);
end $$;

create function set_tracking_enabled(p_order_id uuid, p_enabled boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
begin
  if p_enabled is null then raise exception 'invalid_input'; end if;
  update orders set tracking_enabled = p_enabled where id = o.id;
  perform _log_event(o, 'tracking', o.tracking_enabled::text, p_enabled::text);
end $$;

-- The only function anon may call. Customer-safe fields only: no mobile, customer name,
-- rack, notes, measurements, photos or employee data.
create function get_tracking(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'shop_name', sh.name,
    'slip_no', o.slip_no,
    'garment_summary', coalesce((select string_agg(t.qty || ' ' || t.type, ', ' order by t.type)
      from (select type, sum(qty) as qty from garments where order_id = o.id group by type) t), ''),
    'stage_name', s.name,
    'stage_names', (select jsonb_agg(name order by position) from stages where shop_id = o.shop_id),
    'is_ready', s.position = (select max(position) from stages where shop_id = o.shop_id),
    'special_state', o.special_state,
    'due_date', o.due_date,
    'total_amount', o.total_amount,
    'paid_amount', coalesce((select sum(amount) from payments where order_id = o.id), 0)::int)
  from orders o
  join shops sh on sh.id = o.shop_id
  join stages s on s.id = o.stage_id
  where o.tracking_token = p_token and o.tracking_enabled
$$;

revoke execute on function record_whatsapp_send(uuid, text), set_tracking_enabled(uuid, boolean),
  get_tracking(text) from public, anon;
grant execute on function record_whatsapp_send(uuid, text), set_tracking_enabled(uuid, boolean) to authenticated;
grant execute on function get_tracking(text) to anon, authenticated;

-- ---------- board_orders: real comm_kind / communicated ----------
-- Same columns, names, types and order as before; only comm_kind/communicated change.
create or replace view board_orders as
select
  b.id, b.slip_no, b.customer_name, b.customer_mobile, b.due_date, b.stage_id, b.stage_name, b.stage_position,
  b.is_ready, b.special_state, b.rack, b.assignee_id, b.assignee_name, b.total_amount, b.paid_amount,
  b.garment_summary, b.tracking_token, b.tracking_enabled,
  b.comm_kind,
  coalesce(b.comm_kind is not null and exists (
    select 1 from whatsapp_sends w
    where w.order_id = b.id and w.kind = b.comm_kind
      and w.created_at >= case b.comm_kind
        when 'ready' then (select max(created_at) from order_events
                           where order_id = b.id and action = 'stage' and to_value = b.stage_id::text)
        when 'date_changed' then (select max(created_at) from order_events where order_id = b.id and action = 'due_date')
        else b.created_at end), false) as communicated,
  b.created_at, b.updated_at
from (
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
    case
      when o.special_state in ('delivered', 'cancelled') then null
      when s.position = (select max(position) from stages where shop_id = o.shop_id) then 'ready'
      when exists (select 1 from order_events where order_id = o.id and action = 'due_date') then 'date_changed'
      else 'created'
    end::text as comm_kind,
    o.created_at, o.updated_at
  from orders o
  join stages s on s.id = o.stage_id
  left join members m on m.id = o.assignee_id
  where o.shop_id = (select current_shop_id())
) b;

revoke all on board_orders from public, anon, authenticated;
grant select on board_orders to authenticated;
