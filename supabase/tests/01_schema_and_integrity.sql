begin;
select plan(19);

select has_table('public', 'tasks', 'existe la tabla de tareas');
select has_table('public', 'shopping_items', 'existe la tabla de artículos');
select has_table('public', 'expenses', 'existe la tabla de gastos');
select ok(exists (
  select 1 from pg_proc
  where pronamespace = 'public'::regnamespace
    and proname = 'transfer_household_ownership'
    and oidvectortypes(proargtypes) = 'uuid, uuid'
    and prosecdef
), 'existe la transferencia de propiedad');
select ok(exists (
  select 1 from pg_proc
  where pronamespace = 'public'::regnamespace
    and proname = 'regenerate_household_invite_code'
    and oidvectortypes(proargtypes) = 'uuid'
    and prosecdef
), 'existe la regeneración de invitaciones');
select ok(exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'validate_task_household_refs' and pronargs = 0 and prosecdef), 'existe el trigger de tareas');
select ok(exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'validate_event_household_refs' and pronargs = 0 and prosecdef), 'existe el trigger de eventos');
select ok(exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'validate_expense_household_refs' and pronargs = 0 and prosecdef), 'existe el trigger de gastos');
select ok(exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'validate_shopping_item_household_refs' and pronargs = 0 and prosecdef), 'existe el trigger de artículos');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.tasks'::regclass and tgname = 'tasks_validate_household_refs' and not tgisinternal), 'tareas validan referencias de hogar');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.events'::regclass and tgname = 'events_validate_household_refs' and not tgisinternal), 'eventos validan referencias de hogar');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.expenses'::regclass and tgname = 'expenses_validate_household_refs' and not tgisinternal), 'gastos validan referencias de hogar');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.shopping_items'::regclass and tgname = 'shopping_items_validate_household_refs' and not tgisinternal), 'artículos validan referencias de hogar');
select ok(exists (
  select 1 from pg_attribute
  where attrelid = 'public.profiles'::regclass and attname = 'phone'
    and atttypid = 'text'::regtype and not attisdropped
), 'profiles.phone es texto');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and conname = 'profiles_phone_check'
), 'phone acepta nulo o entre 6 y 20 caracteres');
select ok(exists (
  select 1 from pg_trigger
  where tgrelid = 'public.tasks'::regclass
    and tgname = 'tasks_completed_at'
    and tgfoid = 'public.tasks_set_completed_at()'::regprocedure
), 'completed_at usa su trigger');
select ok(exists (
  select 1 from pg_trigger
  where tgrelid = 'public.tasks'::regclass
    and tgname = 'tasks_updated_at'
    and tgfoid = 'public.set_updated_at()'::regprocedure
), 'updated_at usa su trigger');
select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'meal_plans'
  ),
  'meal_plans está en Realtime'
);
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'expenses_one_per_shopping_list'), 'existe el índice único de gasto por lista');

select * from finish();
rollback;
