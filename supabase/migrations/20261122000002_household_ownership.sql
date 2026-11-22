-- HomePlanner — Correcciones tras 20261122000002.
-- Ejecutar DESPUÉS de 20261122000001 y 20261122000002. Es idempotente.

-- 1) Transferencia de propiedad: mantiene households.created_by coherente.
--    Sin esto, el propietario original no podría eliminar su cuenta después
--    de transferir el hogar (households.created_by referencia a profiles
--    sin ON DELETE).
create or replace function public.transfer_household_ownership(p_household uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.household_members
    where household_id = p_household and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Solo el propietario actual puede transferir la propiedad';
  end if;

  if not exists (
    select 1 from public.household_members
    where household_id = p_household and user_id = p_new_owner
  ) then
    raise exception 'El nuevo propietario debe ser miembro del hogar';
  end if;

  update public.household_members set role = 'member'
  where household_id = p_household and user_id = auth.uid();

  update public.household_members set role = 'owner'
  where household_id = p_household and user_id = p_new_owner;

  update public.households set created_by = p_new_owner
  where id = p_household;
end;
$$;

-- 2) Regenerar código: en Supabase, pgcrypto vive en el esquema "extensions",
--    que no está en el search_path = public de la versión anterior.
create or replace function public.regenerate_household_invite_code(p_household uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not exists (
    select 1 from public.household_members
    where household_id = p_household and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Solo el propietario actual puede regenerar el código';
  end if;

  loop
    new_code := upper(encode(gen_random_bytes(4), 'hex'));
    exit when not exists (select 1 from public.households where invite_code = new_code);
  end loop;

  update public.households set invite_code = new_code where id = p_household;
  return new_code;
end;
$$;

-- 3) Un único gasto por lista de compras (solo si no hay duplicados).
do $$
begin
  if exists (
    select 1 from public.expenses
    where shopping_list_id is not null
    group by shopping_list_id
    having count(*) > 1
  ) then
    raise notice 'Hay gastos duplicados por lista de compras: no se crea el índice único. Revisa los datos.';
  else
    create unique index if not exists expenses_one_per_shopping_list
      on public.expenses (shopping_list_id)
      where shopping_list_id is not null;
  end if;
end $$;