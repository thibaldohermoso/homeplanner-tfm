-- HomePlanner — Transferencia de propiedad y regeneración de invitaciones.

create or replace function public.transfer_household_ownership(p_household uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
end;
$$;

create or replace function public.regenerate_household_invite_code(p_household uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if not exists (
    select 1 from public.household_members
    where household_id = p_household and user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Solo el propietario actual puede regenerar el código';
  end if;

  loop
    new_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));
    exit when not exists (select 1 from public.households where invite_code = new_code);
  end loop;

  update public.households set invite_code = new_code where id = p_household;
  return new_code;
end;
$$;

revoke all on function public.transfer_household_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_household_ownership(uuid, uuid) to authenticated;
revoke all on function public.regenerate_household_invite_code(uuid) from public, anon;
grant execute on function public.regenerate_household_invite_code(uuid) to authenticated;
