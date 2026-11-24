-- =====================================================================
--  CDL Classroom Inventory — Supabase schema
--  Run this ONCE in: Supabase Dashboard > SQL Editor > New query > Run
--  Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================================

-- ---------- Tables -----------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null,
  name       text not null,
  role       text not null default 'Staff' check (role in ('Admin','Staff')),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

create table if not exists public.rooms (
  name       text primary key check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
create unique index if not exists rooms_name_ci_key on public.rooms (lower(name));

create table if not exists public.items (
  id                  text primary key default gen_random_uuid()::text,
  name                text not null check (length(trim(name)) > 0),
  description         text not null default '',
  old_property        text not null default '',
  new_property        text not null default '',
  unit_measure        text not null default '',
  unit_value          numeric(14,2) not null default 0 check (unit_value >= 0),
  qty_property_card   integer not null default 1 check (qty_property_card >= 0),
  qty_physical        integer not null default 1 check (qty_physical >= 0),
  location            text not null default '',
  condition           text not null default 'Good' check (condition in ('Good','Fair','Needs Repair','Missing')),
  item_remarks        text not null default '',
  accountable_name    text not null default '',
  source              text not null default '',
  acquisition_remarks text not null default '',
  room                text not null references public.rooms(name) on update cascade on delete restrict,
  category            text not null default 'Furniture',
  minimum             integer not null default 0 check (minimum >= 0),
  image               text not null default '',          -- compressed JPEG data URL (same as before)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists items_room_idx on public.items (room);

create table if not exists public.transfers (
  id          bigint generated always as identity primary key,
  item_id     text,
  item_name   text not null,
  from_room   text not null,
  to_room     text not null,
  quantity    integer not null check (quantity > 0),
  by_name     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.inspections (
  id           text primary key default gen_random_uuid()::text,
  room         text not null,
  inspect_date date not null,
  inspector    text not null,
  purpose      text not null default '',
  status       text not null default 'Scheduled' check (status in ('Scheduled','Completed')),
  created_at   timestamptz not null default now()
);

create table if not exists public.history (
  id         bigint generated always as identity primary key,
  user_name  text not null,
  action     text not null,
  details    text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists history_created_idx on public.history (created_at desc);

-- ---------- Internal helpers (not callable from the browser) -----------
create or replace function public._is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin');
$$;

create or replace function public._require_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Session expired. Please sign in again.' using errcode = '42501'; end if;
  if not public._is_admin() then raise exception 'Administrator permission required.' using errcode = '42501'; end if;
end $$;

create or replace function public._log(p_action text, p_details text) returns void
language sql security definer set search_path = public as $$
  insert into public.history (user_name, action, details)
  values (coalesce((select name from public.profiles where id = auth.uid()), 'System'), p_action, coalesce(p_details, ''));
$$;

create or replace function public._fmt(ts timestamptz) returns text
language sql immutable as $$ select to_char(ts at time zone 'Asia/Manila', 'YYYY-MM-DD HH24:MI') $$;

create or replace function public._try_ts(t text) returns timestamptz
language plpgsql stable as $$
begin
  return (t::timestamp) at time zone 'Asia/Manila';
exception when others then return now();
end $$;

create or replace function public._try_date(t text) returns date
language plpgsql stable as $$
begin
  return t::date;
exception when others then return current_date;
end $$;

create or replace function public._item_json(i public.items) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', i.id, 'name', i.name, 'description', i.description,
    'oldProperty', i.old_property, 'newProperty', i.new_property,
    'unitMeasure', i.unit_measure, 'unitValue', i.unit_value,
    'qtyPropertyCard', i.qty_property_card, 'qtyPhysical', i.qty_physical,
    'location', i.location, 'condition', i.condition,
    'itemRemarks', i.item_remarks, 'accountableName', i.accountable_name,
    'source', i.source, 'acquisitionRemarks', i.acquisition_remarks,
    'room', i.room, 'category', i.category, 'minimum', i.minimum, 'image', i.image);
$$;

-- Same JSON shape the frontend already expects (data.rooms / items / ...)
create or replace function public._snapshot(p_history_limit int) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'rooms', coalesce((select jsonb_agg(r.name order by r.name) from public.rooms r), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(public._item_json(i) order by lower(i.name), i.id) from public.items i), '[]'::jsonb),
    'transfers', coalesce((select jsonb_agg(jsonb_build_object(
        'date', public._fmt(t.created_at), 'item', t.item_name, 'from', t.from_room,
        'to', t.to_room, 'quantity', t.quantity, 'by', t.by_name) order by t.created_at desc, t.id desc)
      from public.transfers t), '[]'::jsonb),
    'inspections', coalesce((select jsonb_agg(jsonb_build_object(
        'id', n.id, 'date', to_char(n.inspect_date, 'YYYY-MM-DD'), 'room', n.room,
        'inspector', n.inspector, 'purpose', n.purpose, 'status', n.status) order by n.inspect_date desc, n.created_at desc)
      from public.inspections n), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(x.j order by x.created_at desc, x.id desc) from (
        select h.id, h.created_at, jsonb_build_object(
          'date', public._fmt(h.created_at), 'user', h.user_name, 'action', h.action, 'details', h.details) as j
        from public.history h order by h.created_at desc, h.id desc limit p_history_limit) x), '[]'::jsonb)
  );
$$;

-- ---------- New user -> profile (role is ALWAYS Staff here) ------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, name, role)
  values (
    new.id,
    lower(coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1))),
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    'Staff');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------------------------------------
-- Signed-in users may READ. Nobody writes directly: every change goes through
-- the functions below, which check the Admin role and write the activity log.
alter table public.profiles    enable row level security;
alter table public.rooms       enable row level security;
alter table public.items       enable row level security;
alter table public.transfers   enable row level security;
alter table public.inspections enable row level security;
alter table public.history     enable row level security;

drop policy if exists "read own or admin" on public.profiles;
create policy "read own or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public._is_admin());

drop policy if exists "signed-in read" on public.rooms;
create policy "signed-in read" on public.rooms for select to authenticated using (true);
drop policy if exists "signed-in read" on public.items;
create policy "signed-in read" on public.items for select to authenticated using (true);
drop policy if exists "signed-in read" on public.transfers;
create policy "signed-in read" on public.transfers for select to authenticated using (true);
drop policy if exists "signed-in read" on public.inspections;
create policy "signed-in read" on public.inspections for select to authenticated using (true);
drop policy if exists "signed-in read" on public.history;
create policy "signed-in read" on public.history for select to authenticated using (true);

revoke all on table public.profiles, public.rooms, public.items, public.transfers, public.inspections, public.history
  from anon, authenticated;
grant select on table public.profiles, public.rooms, public.items, public.transfers, public.inspections, public.history
  to authenticated;

-- ---------- Functions the app calls ------------------------------------
create or replace function public.load_all() returns jsonb
language sql stable security invoker set search_path = public as $$
  select public._snapshot(1000);
$$;

create or replace function public.add_room(p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v text := trim(coalesce(p_name, ''));
begin
  perform public._require_admin();
  if v = '' then raise exception 'Enter a classroom name.'; end if;
  if exists (select 1 from rooms where lower(name) = lower(v)) then raise exception 'Classroom already exists.'; end if;
  insert into rooms (name) values (v);
  perform public._log('Classroom added', 'Classroom ' || v);
end $$;

create or replace function public.delete_room(p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public._require_admin();
  select count(*) into n from items where room = p_name;
  if n > 0 then raise exception 'Move or delete the % inventory record(s) in this classroom first.', n; end if;
  delete from rooms where name = p_name;
  if not found then raise exception 'Classroom not found.'; end if;
  perform public._log('Classroom deleted', 'Classroom ' || p_name);
end $$;

create or replace function public.save_item(p_item jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id   text := nullif(trim(coalesce(p_item->>'id', '')), '');
  v_name text := trim(coalesce(p_item->>'name', ''));
  v_room text := trim(coalesce(p_item->>'room', ''));
  v_cond text := coalesce(nullif(p_item->>'condition', ''), 'Good');
  v_img  text := coalesce(p_item->>'image', '');
  v_phys int; v_card int; v_min int; v_val numeric;
  v_row  public.items;
begin
  perform public._require_admin();
  if v_name = '' or v_room = '' then raise exception 'Article/Item and classroom are required.'; end if;
  if not exists (select 1 from rooms where name = v_room) then raise exception 'Classroom "%" does not exist.', v_room; end if;
  if v_cond not in ('Good','Fair','Needs Repair','Missing') then raise exception 'Invalid condition.'; end if;
  if length(v_img) > 4000000 then raise exception 'Image is too large.'; end if;
  begin
    v_phys := (p_item->>'qtyPhysical')::int;
    v_card := (p_item->>'qtyPropertyCard')::int;
    v_min  := coalesce(nullif(p_item->>'minimum', ''), '0')::int;
    v_val  := coalesce(nullif(p_item->>'unitValue', ''), '0')::numeric;
  exception when others then
    raise exception 'Quantities and unit value must be valid numbers.';
  end;
  if v_phys is null or v_card is null or v_phys < 0 or v_card < 0 or v_min < 0 or v_val < 0 then
    raise exception 'Both quantity fields must be whole numbers equal to or greater than zero.';
  end if;

  if v_id is null then
    insert into items (name, description, old_property, new_property, unit_measure, unit_value, qty_property_card, qty_physical,
                       location, condition, item_remarks, accountable_name, source, acquisition_remarks, room, category, minimum, image)
    values (v_name, coalesce(p_item->>'description',''), coalesce(p_item->>'oldProperty',''), coalesce(p_item->>'newProperty',''),
            coalesce(p_item->>'unitMeasure',''), v_val, v_card, v_phys, coalesce(p_item->>'location',''), v_cond,
            coalesce(p_item->>'itemRemarks',''), coalesce(p_item->>'accountableName',''), coalesce(p_item->>'source',''),
            coalesce(p_item->>'acquisitionRemarks',''), v_room, coalesce(nullif(p_item->>'category',''), 'Other'), v_min, v_img)
    returning * into v_row;
    perform public._log('Inventory added', v_row.name || ' (' || v_row.room || ')');
  else
    update items set
      name = v_name, description = coalesce(p_item->>'description',''), old_property = coalesce(p_item->>'oldProperty',''),
      new_property = coalesce(p_item->>'newProperty',''), unit_measure = coalesce(p_item->>'unitMeasure',''), unit_value = v_val,
      qty_property_card = v_card, qty_physical = v_phys, location = coalesce(p_item->>'location',''), condition = v_cond,
      item_remarks = coalesce(p_item->>'itemRemarks',''), accountable_name = coalesce(p_item->>'accountableName',''),
      source = coalesce(p_item->>'source',''), acquisition_remarks = coalesce(p_item->>'acquisitionRemarks',''),
      room = v_room, category = coalesce(nullif(p_item->>'category',''), 'Other'), minimum = v_min, image = v_img,
      updated_at = now()
    where id = v_id returning * into v_row;
    if not found then raise exception 'Item not found.'; end if;
    perform public._log('Inventory updated', v_row.name || ' (' || v_row.room || ')');
  end if;
  return jsonb_build_object('ok', true, 'id', v_row.id);
end $$;

create or replace function public.delete_item(p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare v public.items;
begin
  perform public._require_admin();
  delete from items where id = p_id returning * into v;
  if not found then raise exception 'Item not found.'; end if;
  perform public._log('Inventory deleted', v.name || ' (' || v.room || ')');
end $$;

-- Moves p_qty units to another classroom. Whole quantity = the record moves;
-- partial quantity = source keeps the rest, a new record is created in the target.
create or replace function public.transfer_item(p_id text, p_room text, p_qty int) returns void
language plpgsql security definer set search_path = public as $$
declare v public.items;
begin
  perform public._require_admin();
  select * into v from items where id = p_id for update;
  if not found then raise exception 'Item not found.'; end if;
  if not exists (select 1 from rooms where name = p_room) then raise exception 'Classroom not found.'; end if;
  if v.room = p_room then raise exception 'Choose a different classroom.'; end if;
  if p_qty is null or p_qty < 1 or p_qty > v.qty_physical then raise exception 'Check transfer details and available quantity.'; end if;

  if p_qty = v.qty_physical then
    update items set room = p_room, updated_at = now() where id = p_id;
  else
    update items set qty_physical = qty_physical - p_qty,
                     qty_property_card = greatest(qty_property_card - p_qty, 0),
                     updated_at = now() where id = p_id;
    insert into items (name, description, old_property, new_property, unit_measure, unit_value, qty_property_card, qty_physical,
                       location, condition, item_remarks, accountable_name, source, acquisition_remarks, room, category, minimum, image)
    values (v.name, v.description, v.old_property, v.new_property, v.unit_measure, v.unit_value, p_qty, p_qty,
            v.location, v.condition, v.item_remarks, v.accountable_name, v.source, v.acquisition_remarks, p_room, v.category, v.minimum, v.image);
  end if;

  insert into transfers (item_id, item_name, from_room, to_room, quantity, by_name)
  values (v.id, v.name, v.room, p_room, p_qty, coalesce((select name from profiles where id = auth.uid()), 'System'));
  perform public._log('Item transferred', v.name || ' x' || p_qty || ': ' || v.room || ' → ' || p_room);
end $$;

create or replace function public.save_inspection(p_room text, p_date text, p_inspector text, p_purpose text) returns void
language plpgsql security definer set search_path = public as $$
declare d date;
begin
  perform public._require_admin();
  if coalesce(trim(p_room),'') = '' or coalesce(trim(p_date),'') = '' or coalesce(trim(p_inspector),'') = '' then
    raise exception 'Complete the required inspection details.';
  end if;
  if not exists (select 1 from rooms where name = p_room) then raise exception 'Classroom not found.'; end if;
  begin d := p_date::date; exception when others then raise exception 'Invalid inspection date.'; end;
  insert into inspections (room, inspect_date, inspector, purpose) values (p_room, d, trim(p_inspector), coalesce(p_purpose, ''));
  perform public._log('Inspection scheduled', 'Classroom ' || p_room || ' on ' || to_char(d, 'YYYY-MM-DD'));
end $$;

create or replace function public.complete_inspection(p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare v public.inspections;
begin
  perform public._require_admin();
  update inspections set status = 'Completed' where id = p_id and status = 'Scheduled' returning * into v;
  if not found then raise exception 'Inspection not found or already completed.'; end if;
  perform public._log('Inspection completed', 'Classroom ' || v.room || ' on ' || to_char(v.inspect_date, 'YYYY-MM-DD'));
end $$;

create or replace function public.log_password_change() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Session expired. Please sign in again.' using errcode = '42501'; end if;
  perform public._log('Password changed', 'Account password updated');
end $$;

create or replace function public.backup_data() returns jsonb
language plpgsql security definer set search_path = public as $$
declare snap jsonb;
begin
  perform public._require_admin();
  snap := public._snapshot(null);
  perform public._log('Backup downloaded', 'Full backup exported');
  return jsonb_build_object('app', 'CDL Inventory', 'version', 2, 'exportedAt', now()) || snap;
end $$;

-- REPLACES all rooms, items, transfers, inspections and history with the backup contents.
create or replace function public.restore_data(p_backup jsonb) returns void
language plpgsql security definer set search_path = public set statement_timeout = '120s' as $$
begin
  perform public._require_admin();
  if p_backup is null or jsonb_typeof(p_backup) <> 'object' or jsonb_typeof(p_backup->'items') is distinct from 'array' then
    raise exception 'Invalid or incompatible backup file.';
  end if;

  delete from history where true;
  delete from transfers where true;
  delete from inspections where true;
  delete from items where true;
  delete from rooms where true;

  -- rooms: strings or {name:..} objects, plus any room referenced by an item
  insert into rooms (name)
  select distinct on (lower(n)) n from (
    select trim(case when jsonb_typeof(r) = 'string' then r #>> '{}' else r->>'name' end) as n
      from jsonb_array_elements(coalesce(p_backup->'rooms', '[]'::jsonb)) r
    union
    select trim(coalesce(nullif(x.room, ''), 'Unassigned'))
      from jsonb_to_recordset(p_backup->'items') as x(room text)
  ) q where n is not null and n <> '';

  insert into items (id, name, description, old_property, new_property, unit_measure, unit_value, qty_property_card, qty_physical,
                     location, condition, item_remarks, accountable_name, source, acquisition_remarks, room, category, minimum, image)
  select coalesce(nullif(x.id, ''), gen_random_uuid()::text),
         coalesce(nullif(trim(x.name), ''), 'Unnamed item'),
         coalesce(x.description, ''), coalesce(x."oldProperty", ''), coalesce(x."newProperty", ''), coalesce(x."unitMeasure", ''),
         coalesce(nullif(x."unitValue", ''), '0')::numeric,
         coalesce(nullif(x."qtyPropertyCard", ''), nullif(x.quantity, ''), nullif(x."qtyPhysical", ''), '0')::int,
         coalesce(nullif(x."qtyPhysical", ''), nullif(x.quantity, ''), '0')::int,
         coalesce(x.location, ''),
         case when x.condition in ('Good','Fair','Needs Repair','Missing') then x.condition else 'Good' end,
         coalesce(x."itemRemarks", ''), coalesce(x."accountableName", ''), coalesce(x.source, ''), coalesce(x."acquisitionRemarks", ''),
         (select r.name from rooms r where lower(r.name) = lower(trim(coalesce(nullif(x.room, ''), 'Unassigned')))),
         coalesce(nullif(x.category, ''), 'Other'),
         coalesce(nullif(x.minimum, ''), '0')::int,
         coalesce(x.image, '')
  from jsonb_to_recordset(p_backup->'items') as x(
    id text, name text, description text, "oldProperty" text, "newProperty" text, "unitMeasure" text, "unitValue" text,
    "qtyPropertyCard" text, "qtyPhysical" text, quantity text, location text, condition text, "itemRemarks" text,
    "accountableName" text, source text, "acquisitionRemarks" text, room text, category text, minimum text, image text);

  insert into transfers (item_name, from_room, to_room, quantity, by_name, created_at)
  select coalesce(x.item, ''), coalesce(x."from", ''), coalesce(x."to", ''),
         greatest(coalesce(nullif(x.quantity, ''), '1')::int, 1), coalesce(nullif(x.by, ''), 'System'), public._try_ts(x.date)
  from jsonb_to_recordset(coalesce(p_backup->'transfers', '[]'::jsonb)) as x(date text, item text, "from" text, "to" text, quantity text, by text);

  insert into inspections (id, room, inspect_date, inspector, purpose, status)
  select coalesce(nullif(x.id, ''), gen_random_uuid()::text), coalesce(x.room, ''), public._try_date(x.date),
         coalesce(nullif(x.inspector, ''), '—'), coalesce(x.purpose, ''),
         case when x.status = 'Completed' then 'Completed' else 'Scheduled' end
  from jsonb_to_recordset(coalesce(p_backup->'inspections', '[]'::jsonb)) as x(id text, date text, room text, inspector text, purpose text, status text);

  insert into history (user_name, action, details, created_at)
  select coalesce(nullif(x."user", ''), 'System'), coalesce(x.action, ''), coalesce(x.details, ''), public._try_ts(x.date)
  from jsonb_to_recordset(coalesce(p_backup->'history', '[]'::jsonb)) as x(date text, "user" text, action text, details text);

  perform public._log('Backup restored', 'All records replaced from a backup file');
end $$;

-- Public, read-only classroom page opened from a QR code (no login).
-- Exposes ONLY the columns the public page shows; item photos, values and names are not included.
create or replace function public.public_room(p_room text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from rooms where lower(name) = lower(trim(coalesce(p_room, '')));
  if v_name is null then raise exception 'Classroom not found.'; end if;
  return jsonb_build_object(
    'room', v_name,
    'generated', public._fmt(now()),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'name', i.name, 'description', i.description, 'oldProperty', i.old_property, 'newProperty', i.new_property,
        'location', i.location, 'condition', i.condition, 'qtyPhysical', i.qty_physical) order by lower(i.name))
      from items i where i.room = v_name), '[]'::jsonb));
end $$;

-- ---------- Function permissions --------------------------------------
-- Supabase grants new functions to anon/authenticated by default, so revoke first.
do $$
declare f text;
begin
  foreach f in array array[
    '_is_admin()', '_require_admin()', '_log(text,text)', '_fmt(timestamptz)', '_try_ts(text)', '_try_date(text)',
    '_item_json(public.items)', '_snapshot(int)', 'handle_new_user()',
    'load_all()', 'add_room(text)', 'delete_room(text)', 'save_item(jsonb)', 'delete_item(text)',
    'transfer_item(text,text,int)', 'save_inspection(text,text,text,text)', 'complete_inspection(text)',
    'log_password_change()', 'backup_data()', 'restore_data(jsonb)', 'public_room(text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- _is_admin is used inside RLS policies, so signed-in users need to be able to run it.
grant execute on function public._is_admin()                              to authenticated;
-- _snapshot is used inside load_all (security invoker), so the caller needs it.
grant execute on function public._snapshot(int)                           to authenticated;
grant execute on function public._item_json(public.items)                 to authenticated;
grant execute on function public._fmt(timestamptz)                        to authenticated;

grant execute on function public.load_all()                               to authenticated;
grant execute on function public.add_room(text)                           to authenticated;
grant execute on function public.delete_room(text)                        to authenticated;
grant execute on function public.save_item(jsonb)                         to authenticated;
grant execute on function public.delete_item(text)                        to authenticated;
grant execute on function public.transfer_item(text,text,int)             to authenticated;
grant execute on function public.save_inspection(text,text,text,text)     to authenticated;
grant execute on function public.complete_inspection(text)                to authenticated;
grant execute on function public.log_password_change()                    to authenticated;
grant execute on function public.backup_data()                            to authenticated;
grant execute on function public.restore_data(jsonb)                      to authenticated;
grant execute on function public.public_room(text)                        to anon, authenticated;

-- _fmt is also needed by public_room (runs as definer, so fine) — nothing else to grant.
-- =====================================================================
--  After the first account is created in the app, make it an Admin:
--     update public.profiles set role = 'Admin' where username = 'your-username';
-- =====================================================================
