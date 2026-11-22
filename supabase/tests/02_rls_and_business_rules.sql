-- Crea tres usuarios temporales dentro de la transacción.
-- A y B comparten un hogar; C permanece sin hogar. Todo se revierte al terminar.
begin;
select plan(24);

create temp table hp_test_users(n int, id uuid primary key);
insert into auth.users (id, aud, role, email, email_confirmed_at)
select id, 'authenticated', 'authenticated', 'hp-test-' || n || '-' || replace(id::text, '-', '') || '@example.test', now()
from (
  values (1, gen_random_uuid()), (2, gen_random_uuid()), (3, gen_random_uuid())
) as seed(n, id);
insert into hp_test_users
select row_number() over (order by id)::int, id
from auth.users
where email like 'hp-test-%@example.test';

select ok((select count(*) from hp_test_users) >= 3, 'existen A, B y C para probar RLS');

set local role postgres;
create temp table hp_test_households as
select gen_random_uuid() as a_id, gen_random_uuid() as b_id;
grant select on hp_test_users, hp_test_households to authenticated;
insert into public.profiles (id, display_name)
select id, 'Usuario de prueba ' || n from hp_test_users
on conflict (id) do nothing;
insert into public.households (id, name, created_by)
select a_id, 'HP Test A', (select id from hp_test_users where n = 1) from hp_test_households;
insert into public.households (id, name, created_by)
select b_id, 'HP Test B', (select id from hp_test_users where n = 2) from hp_test_households;
insert into public.household_members (household_id, user_id, role)
select a_id, (select id from hp_test_users where n = 1), 'owner' from hp_test_households;
insert into public.household_members (household_id, user_id, role)
select b_id, (select id from hp_test_users where n = 2), 'owner' from hp_test_households;
insert into public.expense_categories (household_id, name, color)
select a_id, 'Pruebas', '#000000' from hp_test_households;
insert into public.expense_categories (household_id, name, color)
select b_id, 'Pruebas B', '#111111' from hp_test_households;
insert into public.shopping_lists (household_id, name)
select a_id, 'Lista de pruebas' from hp_test_households;
insert into public.shopping_lists (household_id, name)
select b_id, 'Lista de pruebas B' from hp_test_households;
create temp table hp_invite_code as
select invite_code
from public.households
where id = (select a_id from hp_test_households);
grant select on hp_invite_code to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select id from hp_test_users where n = 1)::text, 'role', 'authenticated')::text, true);
create temp table hp_created_household(id uuid);
insert into hp_created_household select public.create_household('HP Test Seeded');

select is((select count(*)::int from public.expense_categories where household_id = (select id from hp_created_household)), 6, 'create_household siembra seis categorías');
select throws_ok($$select public.join_household('NO-EXISTE')$$, 'Código de invitación no válido', 'join_household rechaza un código inválido');

select set_config('request.jwt.claims', json_build_object('sub', (select id from hp_test_users where n = 2)::text, 'role', 'authenticated')::text, true);
select public.join_household((select invite_code from hp_invite_code));
select public.join_household((select invite_code from hp_invite_code));
select is((select count(*)::int from public.household_members where household_id = (select a_id from hp_test_households) and user_id = (select id from hp_test_users where n = 2)), 1, 'unirse dos veces no duplica la membresía');

set local role postgres;
insert into public.tasks (household_id, title, assigned_to)
select b_id, 'Tarea B', (select id from hp_test_users where n = 2) from hp_test_households;
select throws_ok($$insert into public.tasks (household_id, title, assigned_to) select a_id, 'Tarea inválida', (select id from hp_test_users where n = 3) from hp_test_households$$, 'La persona asignada no pertenece al hogar de la tarea', 'tasks rechaza personas de otro hogar');
select throws_ok($$insert into public.events (household_id, title, starts_at, task_id) select a_id, 'Evento inválido', now(), (select id from public.tasks where household_id = b_id limit 1) from hp_test_households$$, 'La tarea enlazada no pertenece al hogar del evento', 'events rechaza tareas de otro hogar');
select throws_ok($$insert into public.expenses (household_id, category_id, amount, paid_by) select a_id, (select id from public.expense_categories where household_id = b_id limit 1), 2.00, (select id from hp_test_users where n = 1) from hp_test_households$$, 'La categoría del gasto no pertenece al hogar', 'expenses rechaza categorías de otro hogar');
select throws_ok($$insert into public.expenses (household_id, category_id, amount, paid_by) select a_id, (select id from public.expense_categories where household_id = a_id limit 1), 2.00, (select id from hp_test_users where n = 3) from hp_test_households$$, 'La persona pagadora no pertenece al hogar del gasto', 'expenses rechaza pagadores de otro hogar');
select throws_ok($$insert into public.expenses (household_id, category_id, amount, shopping_list_id, paid_by) select a_id, (select id from public.expense_categories where household_id = a_id limit 1), 2.00, (select id from public.shopping_lists where household_id = b_id limit 1), (select id from hp_test_users where n = 1) from hp_test_households$$, 'La lista de compras del gasto no pertenece al hogar', 'expenses rechaza listas de otro hogar');
select throws_ok($$insert into public.shopping_items (household_id, list_id, name) select a_id, (select id from public.shopping_lists where household_id = b_id limit 1), 'Artículo inválido' from hp_test_households$$, 'La lista de compras no pertenece al hogar del artículo', 'shopping_items rechaza listas de otro hogar');
insert into public.tasks (household_id, title, assigned_to)
select a_id, 'Tarea A', (select id from hp_test_users where n = 1) from hp_test_households;
insert into public.shopping_items (household_id, list_id, name)
select a_id, (select id from public.shopping_lists where household_id = a_id limit 1), 'Artículo A' from hp_test_households;
insert into public.meal_plans (household_id, plan_date, meal_type, title)
select a_id, current_date, 'lunch', 'Comida A' from hp_test_households;
insert into public.events (household_id, title, starts_at)
select a_id, 'Evento A', now() from hp_test_households;
insert into public.expenses (household_id, category_id, amount, paid_by, shopping_list_id)
select a_id, (select id from public.expense_categories where household_id = a_id limit 1), 1.00, (select id from hp_test_users where n = 1), (select id from public.shopping_lists where household_id = a_id limit 1) from hp_test_households;
select throws_ok($$insert into public.expenses (household_id, category_id, amount, shopping_list_id, paid_by) select a_id, (select id from public.expense_categories where household_id = a_id limit 1), 3.00, (select id from public.shopping_lists where household_id = a_id limit 1), (select id from hp_test_users where n = 1) from hp_test_households$$, 'duplicate key value violates unique constraint "expenses_one_per_shopping_list"', 'expenses limita a un gasto por lista');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select id from hp_test_users where n = 1)::text, 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.tasks where household_id = (select a_id from hp_test_households)), 1, 'A ve sus tareas');
select is((select count(*)::int from public.shopping_items where household_id = (select a_id from hp_test_households)), 1, 'A ve sus compras');
select is((select count(*)::int from public.expenses where household_id = (select a_id from hp_test_households)), 1, 'A ve sus gastos');
select is((select count(*)::int from public.events where household_id = (select a_id from hp_test_households)), 1, 'A ve sus eventos');
select is((select count(*)::int from public.meal_plans where household_id = (select a_id from hp_test_households)), 1, 'A ve sus comidas');

select set_config('request.jwt.claims', json_build_object('sub', (select id from hp_test_users where n = 3)::text, 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.tasks), 0, 'C sin hogar no ve tareas');
select is((select count(*)::int from public.shopping_items), 0, 'C sin hogar no ve compras');
select is((select count(*)::int from public.expenses), 0, 'C sin hogar no ve gastos');

select set_config('request.jwt.claims', json_build_object('sub', (select id from hp_test_users where n = 1)::text, 'role', 'authenticated')::text, true);
select ok(public.regenerate_household_invite_code((select a_id from hp_test_households)) ~ '^[A-Z0-9]{8}$', 'el propietario regenera códigos de ocho caracteres');
select lives_ok($$select public.transfer_household_ownership((select a_id from hp_test_households), (select id from hp_test_users where n = 2))$$, 'el propietario puede transferir el hogar');
select is((select role::text from public.household_members where household_id = (select a_id from hp_test_households) and user_id = (select id from hp_test_users where n = 2)), 'owner', 'el nuevo propietario recibe el rol owner');
select is((select created_by from public.households where id = (select a_id from hp_test_households)), (select id from hp_test_users where n = 2), 'households.created_by sigue al propietario');
select throws_ok($$select public.transfer_household_ownership((select a_id from hp_test_households), (select id from hp_test_users where n = 1))$$, 'Solo el propietario actual puede transferir la propiedad', 'el propietario anterior ya no puede transferir');

select * from finish();
rollback;
