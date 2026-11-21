# HomePlanner — Handoff de la conversación

> Documento de traspaso para retomar el proyecto en una nueva sesión sin perder contexto.
> Fecha de la conversación: 26 de octubre de 2026.

---

## 1. Contexto del proyecto

- **Proyecto:** HomePlanner, aplicación de gestión del hogar. Es el **TFM** de Thibaldo (desarrollador web freelance).
- **Objetivo declarado por el usuario:** desarrollar una **web app** que más adelante se convertirá en **app nativa**.
- **Documento base:** `HomePlanner — SRS v1.0.docx` (Especificación de Requisitos de Software), que es la línea base de trabajo. Los cambios aprobados se reflejan en nuevas versiones, conservando la trazabilidad de los requisitos.
- **Equipo:** 1 persona. **Presupuesto objetivo:** 0 €.

## 2. Fechas clave

| Hito | Fecha |
|---|---|
| Fecha límite oficial | **30 de noviembre de 2026** |
| Fecha de entrega interna | **28 de noviembre de 2026** |
| Colchón para incidencias y entrega | 29 y 30 de noviembre |
| Tiempo disponible al inicio | 37 días |

## 3. Dedicación

- El SRS partía de una estimación de 12–18 h semanales.
- **El usuario fijó 18 h semanales** (el máximo posible) para llegar lo más desarrollado posible a la fecha.
- Del 26 oct al 28 nov hay unas 4,7 semanas, es decir, **unas 85 horas útiles**.

## 4. Alcance (según el SRS)

| Prioridad | Significado | Compromiso |
|---|---|---|
| **P0 — Obligatorio** | Producto mínimo funcional | Terminado, probado y desplegado |
| **P1 — Importante** | Completa la experiencia de los seis módulos | Se desarrolla tras estabilizar P0 |
| **P2 — Ampliación** | Funciones avanzadas | Solo si queda tiempo |

- **P0:** autenticación, hogar compartido, tareas, lista de compras, registro de gastos, calendario básico y planificación de comidas en versión manual y sencilla.
- **P1:** comparación detallada de supermercados, recetas con ingredientes estructurados, presupuestos por categorías y sincronización avanzada.
- El SRS incluye 28 requisitos funcionales, 10 no funcionales, 10 reglas de negocio, 8 casos de uso, arquitectura, modelo conceptual, criterios de aceptación, pruebas, riesgos y planificación.

## 5. Stack e infraestructura (0 €)

| Componente | Coste |
|---|---|
| GitHub | 0 € |
| Next.js / TypeScript | 0 € |
| Supabase Free (PostgreSQL, Auth, Realtime) | 0 € |
| Vercel Hobby | 0 € |
| Dominio propio | No necesario (subdominio gratuito de despliegue) |
| API de IA | No integrada |

**Avisos del SRS:**

- Supabase Free incluye 500 MB de base de datos y los proyectos con poca actividad pueden **pausarse tras unos 7 días**. Hay que comprobar que el entorno esté activo antes de la demo.
- Vercel Hobby está pensado para proyectos personales y no comerciales, lo que encaja con un TFM académico.
- El esquema de datos se conserva mediante migraciones SQL.

## 6. Decisión web → nativa

Propuesta de Claude (pendiente de confirmar por el usuario):

1. **Ahora:** web app responsive e instalable (**PWA**), sin coste y sin pasar por tiendas.
2. **Después:** empaquetarla como app nativa con **Capacitor**, que reutiliza casi todo el código web.
3. **Alternativa más ambiciosa:** Expo / React Native. Mejor experiencia nativa, pero obliga a reescribir la interfaz.

**Reglas para facilitar el salto a nativa desde el principio:**

- La lógica de negocio va en una capa de servicios en `/lib`, no en los componentes.
- Todo el acceso a datos pasa por Supabase, y la seguridad se resuelve con RLS en la base de datos.
- Interfaz mobile-first con áreas táctiles amplias.

**Nota de costes:** publicar en tiendas tiene cuotas (Google Play, pago único; Apple, anual), fuera del presupuesto de 0 €. Se trata como fase posterior al TFM, con la PWA como entrega demostrable.

## 7. Plan de trabajo con 18 h/semana (~85 h)

| Bloque | Contenido | Horas |
|---|---|---|
| Diseño | ER + SQL/RLS, arquitectura y repo, wireframes | ~10 h |
| Cimientos | Next.js en Vercel, Supabase, login, hogar compartido con 2 usuarios | ~14 h |
| P0 | Tareas, compras, gastos, calendario básico, comidas manual | ~30 h |
| P1 | Presupuestos por categorías, recetas con ingredientes, comparación de supermercados | ~20 h |
| Cierre | PWA, pruebas, documentación del TFM, ensayo de demo | ~11 h |

**Calendario orientativo:**

- **Semana 1 (26 oct – 1 nov):** diseño completo y cimientos casi terminados.
- **Semana 2:** cimientos cerrados y arranque de P0 (tareas y compras).
- **Semana 3:** gastos, calendario y comidas. Al acabar, **P0 completo y desplegado**.
- **Semana 4:** P1, empezando por presupuestos y recetas.
- **Semana 5 (hasta el 28 nov):** comparación de supermercados si hay margen, y cierre.

**Reglas de ejecución:**

1. Nada de P1 hasta que P0 esté desplegado y probado.
2. Cada módulo se termina antes de empezar el siguiente (CRUD, validaciones y RLS).
3. La documentación se escribe sobre la marcha, no al final.
4. Si al final de la semana 3 hay más de 5 horas de retraso, se recorta P1 en lugar de comprimir las pruebas.

**Hitos de desarrollo del SRS:** la primera meta es una aplicación Next.js desplegada, con inicio de sesión y dos usuarios compartiendo un hogar. Las relaciones críticas a resolver en el diseño son usuarios–hogares, compras–finanzas y tareas–calendario.

## 8. Entregable producido: migración SQL `20261026000001_init_homeplanner.sql`

Esquema completo de P0 para Supabase con Row Level Security. El código completo está en el **Apéndice A**.

### Tablas

| Módulo | Tablas |
|---|---|
| Usuarios y hogar | `profiles`, `households`, `household_members` |
| Tareas | `tasks` |
| Calendario | `events` |
| Compras | `shopping_lists`, `shopping_items` |
| Gastos | `expense_categories`, `expenses` |
| Comidas | `meal_plans` |

### Relaciones críticas

- **Usuarios y hogares:** N:M mediante `household_members` con rol `owner` o `member`. Se crea con `create_household()` y el segundo usuario entra con `join_household(código)`. Ambas funciones son `security definer`, porque con RLS nadie podría insertarse a sí mismo como miembro. `create_household()` siembra seis categorías de gasto por defecto.
- **Compras y finanzas:** `expenses.shopping_list_id` enlaza un gasto con la lista que lo originó.
- **Tareas y calendario:** las tareas con `due_date` aparecen en el calendario sin duplicar datos. `events.task_id` es un enlace opcional.

### Decisiones de diseño

- `household_id` se repite en `shopping_items` para simplificar RLS y mejorar el rendimiento.
- La seguridad vive en la base de datos (`is_household_member()` en todas las políticas), lo que también protegerá a la futura app nativa.
- Triggers para `updated_at`, `completed_at` de tareas y creación automática de `profiles` al registrarse.
- Realtime activado en `tasks`, `shopping_items`, `expenses` y `events` para sincronizar en vivo a los dos usuarios.
- **Limitación conocida:** la base de datos no impide asignar una tarea a alguien de otro hogar. Se valida en la aplicación y se documenta como mejora.

### Cómo aplicarla

1. Crear un proyecto en Supabase (plan Free) y abrir **SQL Editor**.
2. Pegar el contenido del archivo y ejecutarlo.
3. En **Authentication > Providers**, dejar activado el acceso con email.
4. Probar RLS con dos usuarios: el primero ejecuta `select create_household('Casa');`, el segundo `select join_household('CÓDIGO');`, y un tercero sin hogar no debe ver ninguna fila.

**Estado:** la migración está escrita, pero **todavía no se ha ejecutado ni verificado** en Supabase. Si falla, hay que pasar el mensaje de error para ajustarla.

## 9. Estado actual y próximos pasos

**Hecho:**

- SRS v1.0 definido como línea base.
- Disponibilidad fijada en 18 h/semana y plan de horas repartido.
- Esquema SQL de P0 con RLS redactado.

**Pendiente, en orden:**

1. Ejecutar la migración en Supabase y verificar RLS con dos usuarios de prueba.
2. **Arquitectura y estructura del repositorio Next.js:** carpetas, capa de servicios en `/lib`, cliente de Supabase, rutas protegidas.
3. Diagrama entidad-relación visual y wireframes de las pantallas principales (el usuario puede pedir que se adelanten).
4. Cimientos: Next.js desplegado en Vercel, login y hogar compartido con dos usuarios.
5. Módulos P0 en este orden: tareas, compras, gastos, calendario, comidas.
6. Confirmar el camino web → nativa (PWA + Capacitor frente a Expo).

## 10. Preguntas abiertas

- ¿Se confirma PWA + Capacitor como vía a nativa, o se prefiere Expo / React Native?
- ¿Se quiere el diagrama ER visual y los wireframes antes de empezar el código?

---

## Apéndice A — `20261026000001_init_homeplanner.sql`

```sql
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
```
