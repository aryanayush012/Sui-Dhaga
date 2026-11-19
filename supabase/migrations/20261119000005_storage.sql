-- Private photo bucket scoped per shop (<shop_id>/<uuid>.jpg) + realtime on order_events.
-- Idempotent: hosted `db reset` may not wipe storage/publication state.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
drop policy if exists photos_owner_insert on storage.objects;

create policy photos_read on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select current_shop_id())::text);
create policy photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select current_shop_id())::text
              and (select is_owner()));

do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_events') then
    alter publication supabase_realtime add table order_events;
  end if;
end $$;
