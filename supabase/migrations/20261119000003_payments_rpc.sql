-- Append-only payments + editable order total. Owner only.

create function add_payment(p_order_id uuid, p_amount int, p_method text, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
  v_note text := nullif(btrim(p_note), '');
  v_paid int;
  v_id uuid;
begin
  if coalesce(p_amount, 0) = 0 or coalesce(p_method, '') not in ('cash', 'upi', 'other') then
    raise exception 'invalid_input';
  end if;
  if p_amount < 0 and v_note is null then raise exception 'note_required'; end if;
  select coalesce(sum(amount), 0) + p_amount into v_paid from payments where order_id = o.id;
  if o.total_amount is not null and v_paid > o.total_amount then raise exception 'exceeds_total'; end if;
  if v_paid < 0 then raise exception 'negative_balance'; end if;
  insert into payments (shop_id, order_id, amount, method, note, recorded_by)
    values (o.shop_id, o.id, p_amount, p_method, v_note, (current_member()).id)
    returning id into v_id;
  perform _log_event(o, 'payment', null, p_amount::text);
  return v_id;
end $$;

create function set_total(p_order_id uuid, p_total int) returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders := _order_for_write(p_order_id, true);
begin
  if p_total < 0 then raise exception 'invalid_input'; end if;
  if p_total < (select coalesce(sum(amount), 0) from payments where order_id = o.id) then
    raise exception 'below_paid';
  end if;
  update orders set total_amount = p_total where id = o.id;
  perform _log_event(o, 'total', o.total_amount::text, p_total::text);
end $$;

revoke execute on function add_payment(uuid, int, text, text), set_total(uuid, int) from public, anon;
grant execute on function add_payment(uuid, int, text, text), set_total(uuid, int) to authenticated;
