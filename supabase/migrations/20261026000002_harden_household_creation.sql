-- HomePlanner — Migración 0002: perfiles para usuarios existentes
-- Ejecutar después de 20261026000001_init_homeplanner.sql.

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.profiles (id, display_name)
  select
    u.id,
    coalesce(
      nullif(u.raw_user_meta_data->>'full_name', ''),
      split_part(coalesce(u.email, 'usuario'), '@', 1)
    )
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  clean_name text := trim(coalesce(p_name, ''));
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if char_length(clean_name) not between 1 and 80 then
    raise exception 'El nombre del hogar debe tener entre 1 y 80 caracteres';
  end if;

  perform public.ensure_my_profile();

  insert into public.households (name, created_by)
  values (clean_name, auth.uid())
  returning id into hid;

  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'owner');

  insert into public.expense_categories (household_id, name, color) values
    (hid, 'Alimentación', '#16a34a'),
    (hid, 'Hogar',        '#2563eb'),
    (hid, 'Facturas',     '#dc2626'),
    (hid, 'Transporte',   '#ca8a04'),
    (hid, 'Ocio',         '#9333ea'),
    (hid, 'Otros',        '#64748b');

  return hid;
end;
$$;

create or replace function public.join_household(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  perform public.ensure_my_profile();

  select id into hid
  from public.households
  where invite_code = upper(trim(coalesce(p_code, '')));

  if hid is null then
    raise exception 'Código de invitación no válido';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'member')
  on conflict do nothing;

  return hid;
end;
$$;

revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;
revoke all on function public.create_household(text) from public, anon;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
