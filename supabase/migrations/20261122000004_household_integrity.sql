-- HomePlanner — Integridad entre hogares sin modificar la RLS existente.

create or replace function public.validate_task_household_refs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null and not exists (select 1 from public.household_members where household_id = new.household_id and user_id = new.assigned_to) then
    raise exception 'La persona asignada no pertenece al hogar de la tarea';
  end if;
  return new;
end;
$$;

create or replace function public.validate_event_household_refs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.task_id is not null and not exists (select 1 from public.tasks where id = new.task_id and household_id = new.household_id) then
    raise exception 'La tarea enlazada no pertenece al hogar del evento';
  end if;
  return new;
end;
$$;

create or replace function public.validate_expense_household_refs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is not null and not exists (select 1 from public.expense_categories where id = new.category_id and household_id = new.household_id) then
    raise exception 'La categoría del gasto no pertenece al hogar';
  end if;
  if new.shopping_list_id is not null and not exists (select 1 from public.shopping_lists where id = new.shopping_list_id and household_id = new.household_id) then
    raise exception 'La lista de compras del gasto no pertenece al hogar';
  end if;
  if new.paid_by is not null and not exists (select 1 from public.household_members where household_id = new.household_id and user_id = new.paid_by) then
    raise exception 'La persona pagadora no pertenece al hogar del gasto';
  end if;
  return new;
end;
$$;

create or replace function public.validate_shopping_item_household_refs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.shopping_lists where id = new.list_id and household_id = new.household_id) then
    raise exception 'La lista de compras no pertenece al hogar del artículo';
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_validate_household_refs on public.tasks;
create trigger tasks_validate_household_refs before insert or update on public.tasks for each row execute function public.validate_task_household_refs();
drop trigger if exists events_validate_household_refs on public.events;
create trigger events_validate_household_refs before insert or update on public.events for each row execute function public.validate_event_household_refs();
drop trigger if exists expenses_validate_household_refs on public.expenses;
create trigger expenses_validate_household_refs before insert or update on public.expenses for each row execute function public.validate_expense_household_refs();
drop trigger if exists shopping_items_validate_household_refs on public.shopping_items;
create trigger shopping_items_validate_household_refs before insert or update on public.shopping_items for each row execute function public.validate_shopping_item_household_refs();
