-- =====================================================================
-- HomePlanner — Migración 0001: esquema P0 + Row Level Security
-- Ejecutar en Supabase > SQL Editor (o como migración con Supabase CLI)
-- Módulos: autenticación/hogar, tareas, compras, gastos, calendario, comidas
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Tipos enumerados
-- ---------------------------------------------------------------------
create type public.member_role   as enum ('owner', 'member');
create type public.task_status   as enum ('pending', 'in_progress', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.meal_type     as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------

-- Perfil público de cada usuario (1:1 con auth.users)
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Hogar compartido
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique
              default upper(encode(gen_random_bytes(4), 'hex')),
  created_by  uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- Pertenencia usuario <-> hogar (N:M)
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         public.member_role not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index on public.household_members (user_id);

-- Tareas
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  status       public.task_status   not null default 'pending',
  priority     public.task_priority not null default 'medium',
  assigned_to  uuid references public.profiles(id) on delete set null,
  due_date     date,
  completed_at timestamptz,
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.tasks (household_id, status);
create index on public.tasks (household_id, due_date);

-- Calendario (eventos propios). Las tareas con due_date se muestran
-- también en el calendario; task_id permite enlazar un evento a una tarea.
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  all_day      boolean not null default false,
  task_id      uuid references public.tasks(id) on delete set null,
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index on public.events (household_id, starts_at);

-- Listas de la compra
create table public.shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 100),
  is_archived  boolean not null default false,
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.shopping_lists (household_id, is_archived);

-- Artículos de la lista (household_id desnormalizado para simplificar RLS)
create table public.shopping_items (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  list_id         uuid not null references public.shopping_lists(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 150),
  quantity        numeric(10,2) not null default 1 check (quantity > 0),
  unit            text,
  estimated_price numeric(10,2) check (estimated_price >= 0),
  is_checked      boolean not null default false,
  checked_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.shopping_items (list_id);

-- Categorías de gasto
create table public.expense_categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  color        text not null default '#64748b',
  created_at   timestamptz not null default now(),
  unique (household_id, name)
);

-- Gastos. shopping_list_id enlaza compras con finanzas.
create table public.expenses (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households(id) on delete cascade,
  category_id      uuid references public.expense_categories(id) on delete set null,
  amount           numeric(10,2) not null check (amount > 0),
  description      text,
  spent_on         date not null default current_date,
  paid_by          uuid default auth.uid() references public.profiles(id) on delete set null,
  shopping_list_id uuid references public.shopping_lists(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.expenses (household_id, spent_on desc);

-- Planificación de comidas (versión manual P0)
create table public.meal_plans (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  plan_date    date not null,
  meal_type    public.meal_type not null,
  title        text not null check (char_length(title) between 1 and 150),
  notes        text,
  created_by   uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (household_id, plan_date, meal_type)
);

-- ---------------------------------------------------------------------
-- 3. Triggers utilitarios
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['tasks','events','shopping_lists','shopping_items','expenses','meal_plans']
  loop
    execute format(
      'create trigger %1$s_updated_at before update on public.%1$I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Marca completed_at automáticamente al cambiar el estado de una tarea
create or replace function public.tasks_set_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end $$;

create trigger tasks_completed_at before insert or update on public.tasks
  for each row execute function public.tasks_set_completed_at();

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. Funciones de apoyo para RLS y operaciones del hogar
-- ---------------------------------------------------------------------

create or replace function public.is_household_member(hid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(hid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Crea un hogar, añade al usuario como owner y siembra categorías por defecto
create or replace function public.create_household(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  insert into public.households (name, created_by)
  values (trim(p_name), auth.uid())
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
end $$;

-- Unirse a un hogar existente mediante código de invitación
create or replace function public.join_household(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select id into hid from public.households
  where invite_code = upper(trim(p_code));

  if hid is null then
    raise exception 'Código de invitación no válido';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'member')
  on conflict do nothing;

  return hid;
end $$;

revoke all on function public.create_household(text) from public, anon;
revoke all on function public.join_household(text)   from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text)   to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid)  to authenticated;

-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.households         enable row level security;
alter table public.household_members  enable row level security;
alter table public.tasks              enable row level security;
alter table public.events             enable row level security;
alter table public.shopping_lists     enable row level security;
alter table public.shopping_items     enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses           enable row level security;
alter table public.meal_plans         enable row level security;

-- Perfiles: el propio y los de quienes comparten hogar
create policy profiles_select on public.profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.household_members me
    join public.household_members other on other.household_id = me.household_id
    where me.user_id = auth.uid() and other.user_id = profiles.id
  )
);
create policy profiles_update on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

-- Hogares (la creación pasa por create_household)
create policy households_select on public.households for select to authenticated
using (public.is_household_member(id));
create policy households_update on public.households for update to authenticated
using (public.is_household_owner(id)) with check (public.is_household_owner(id));
create policy households_delete on public.households for delete to authenticated
using (public.is_household_owner(id));

-- Miembros (altas vía create_household / join_household)
create policy members_select on public.household_members for select to authenticated
using (public.is_household_member(household_id));
create policy members_delete on public.household_members for delete to authenticated
using (user_id = auth.uid() or public.is_household_owner(household_id));

-- Tablas de datos del hogar: acceso completo para los miembros
do $$
declare t text;
begin
  foreach t in array array[
    'tasks','events','shopping_lists','shopping_items',
    'expense_categories','expenses','meal_plans'
  ]
  loop
    execute format('create policy %1$s_select on public.%1$I for select to authenticated
                    using (public.is_household_member(household_id))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated
                    with check (public.is_household_member(household_id))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated
                    using (public.is_household_member(household_id))
                    with check (public.is_household_member(household_id))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated
                    using (public.is_household_member(household_id))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Realtime (opcional): sincronización en vivo entre los dos usuarios
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table
  public.tasks, public.shopping_items, public.expenses, public.events;
