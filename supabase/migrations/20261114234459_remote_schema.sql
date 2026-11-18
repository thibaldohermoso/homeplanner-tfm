SET local check_function_bodies = off;

CREATE TABLE "public"."events" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "household_id" uuid                     NOT NULL,
  "title"        text                     NOT NULL,
  "description"  text,
  "starts_at"    timestamp with time zone NOT NULL,
  "ends_at"      timestamp with time zone,
  "all_day"      boolean                  NOT NULL DEFAULT false,
  "task_id"      uuid,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "events_check" CHECK (((ends_at IS NULL) OR (ends_at >= starts_at))),
  CONSTRAINT "events_pkey" PRIMARY KEY (id),
  CONSTRAINT "events_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200))),
  "created_by"   uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."expense_categories" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "household_id" uuid                     NOT NULL,
  "name"         text                     NOT NULL,
  "color"        text                     NOT NULL DEFAULT '#64748b'::text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "expense_categories_household_id_name_key" UNIQUE (household_id, name),
  CONSTRAINT "expense_categories_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 60))),
  CONSTRAINT "expense_categories_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."expense_categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."expenses" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "household_id"     uuid                     NOT NULL,
  "category_id"      uuid,
  "amount"           numeric(10,2)            NOT NULL,
  "description"      text,
  "spent_on"         date                     NOT NULL DEFAULT CURRENT_DATE,
  "shopping_list_id" uuid,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "expenses_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "expenses_pkey" PRIMARY KEY (id),
  "paid_by"          uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."expenses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."household_members" (
  "household_id" uuid NOT NULL,
  "user_id"      uuid NOT NULL,
  CONSTRAINT "household_members_pkey" PRIMARY KEY (household_id, user_id)
);

ALTER TABLE "public"."household_members"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."households" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        text                     NOT NULL,
  "invite_code" text                     NOT NULL DEFAULT upper(encode(extensions.gen_random_bytes(4), 'hex'::text)),
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "households_invite_code_key" UNIQUE (invite_code),
  CONSTRAINT "households_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 80))),
  CONSTRAINT "households_pkey" PRIMARY KEY (id),
  "created_by"  uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."households"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."meal_plans" (
  "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
  "household_id" uuid NOT NULL,
  "plan_date"    date NOT NULL,
  CONSTRAINT "meal_plans_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."meal_plans"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"           uuid                     NOT NULL,
  "display_name" text                     NOT NULL,
  "avatar_url"   text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."shopping_items" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "household_id"    uuid                     NOT NULL,
  "list_id"         uuid                     NOT NULL,
  "name"            text                     NOT NULL,
  "quantity"        numeric(10,2)            NOT NULL DEFAULT 1,
  "unit"            text,
  "estimated_price" numeric(10,2),
  "is_checked"      boolean                  NOT NULL DEFAULT false,
  "checked_by"      uuid,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shopping_items_estimated_price_check" CHECK ((estimated_price >= (0)::numeric)),
  CONSTRAINT "shopping_items_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 150))),
  CONSTRAINT "shopping_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "shopping_items_quantity_check" CHECK ((quantity > (0)::numeric))
);

ALTER TABLE "public"."shopping_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."shopping_lists" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "household_id" uuid                     NOT NULL,
  "name"         text                     NOT NULL,
  "is_archived"  boolean                  NOT NULL DEFAULT false,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shopping_lists_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
  CONSTRAINT "shopping_lists_pkey" PRIMARY KEY (id),
  "created_by"   uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."shopping_lists"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tasks" (
  "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
  "household_id" uuid NOT NULL,
  "title"        text NOT NULL,
  "description"  text,
  CONSTRAINT "tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "tasks_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200)))
);

ALTER TABLE "public"."tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."meal_type" AS ENUM (
  'breakfast',
  'lunch',
  'dinner',
  'snack'
);

ALTER TABLE "public"."meal_plans"
  ADD COLUMN "meal_type" public.meal_type NOT NULL;

ALTER TABLE "public"."meal_plans"
  ADD COLUMN "title" text NOT NULL;

ALTER TABLE "public"."meal_plans"
  ADD COLUMN "notes" text;

ALTER TABLE "public"."meal_plans"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."meal_plans"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE TYPE "public"."member_role" AS ENUM (
  'owner',
  'member'
);

ALTER TABLE "public"."household_members"
  ADD COLUMN "role" public.member_role NOT NULL DEFAULT 'member'::public.member_role;

ALTER TABLE "public"."household_members"
  ADD COLUMN "joined_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE TYPE "public"."task_priority" AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE "public"."task_status" AS ENUM (
  'pending',
  'in_progress',
  'done'
);

ALTER TABLE "public"."tasks"
  ADD COLUMN "status" public.task_status NOT NULL DEFAULT 'pending'::public.task_status;

ALTER TABLE "public"."tasks"
  ADD COLUMN "priority" public.task_priority NOT NULL DEFAULT 'medium'::public.task_priority;

ALTER TABLE "public"."tasks"
  ADD COLUMN "assigned_to" uuid;

ALTER TABLE "public"."tasks"
  ADD COLUMN "due_date" date;

ALTER TABLE "public"."tasks"
  ADD COLUMN "completed_at" timestamp WITH time zone;

ALTER TABLE "public"."tasks"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."tasks"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.create_household (
  p_name text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."create_household"(text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."ensure_my_profile"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1))
  );
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.is_household_member (
  hid uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_household_owner (
  hid uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and role = 'owner'
  );
$function$;

CREATE OR REPLACE FUNCTION public.join_household (
  p_code text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."join_household"(text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.tasks_set_completed_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end $function$;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE SET NULL;

ALTER TABLE "public"."events"
  ADD CONSTRAINT "events_household_id_fkey" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

ALTER TABLE "public"."expense_categories"
  ADD CONSTRAINT "expense_categories_household_id_fkey" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_household_id_fkey" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

ALTER TABLE "public"."household_members"
  ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

ALTER TABLE "public"."meal_plans"
  ADD CONSTRAINT "meal_plans_household_id_fkey" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

ALTER TABLE "public"."meal_plans"
  ADD CONSTRAINT "meal_plans_household_id_plan_date_meal_type_key" UNIQUE (household_id, plan_date, meal_type);

ALTER TABLE "public"."meal_plans"
  ADD CONSTRAINT "meal_plans_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 150)));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."household_members"
  ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."shopping_items"
  ADD CONSTRAINT "shopping_items_checked_by_fkey" FOREIGN KEY (checked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."shopping_items"
  ADD CONSTRAINT "shopping_items_household_id_fkey" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

ALTER TABLE "public"."shopping_lists"
  ADD CONSTRAINT "shopping_lists_household_id_fkey" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_shopping_list_id_fkey" FOREIGN KEY (shopping_list_id) REFERENCES public.shopping_lists(id) ON DELETE SET NULL;

ALTER TABLE "public"."shopping_items"
  ADD CONSTRAINT "shopping_items_list_id_fkey" FOREIGN KEY (list_id) REFERENCES public.shopping_lists(id) ON DELETE CASCADE;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_household_id_fkey" FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

ALTER TABLE "public"."events"
  ADD CONSTRAINT "events_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX events_household_id_starts_at_idx ON public.events USING btree (household_id, starts_at);

CREATE INDEX expenses_household_id_spent_on_idx ON public.expenses USING btree (household_id, spent_on DESC);

CREATE INDEX household_members_user_id_idx ON public.household_members USING btree (user_id);

CREATE INDEX shopping_items_list_id_idx ON public.shopping_items USING btree (list_id);

CREATE INDEX shopping_lists_household_id_is_archived_idx ON public.shopping_lists USING btree (household_id, is_archived);

CREATE INDEX tasks_household_id_due_date_idx ON public.tasks USING btree (household_id, due_date);

CREATE INDEX tasks_household_id_status_idx ON public.tasks USING btree (household_id, status);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER shopping_items_updated_at
  BEFORE UPDATE ON public.shopping_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_completed_at
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_set_completed_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "events_delete" ON "public"."events"
  FOR DELETE
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "events_insert" ON "public"."events"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "events_select" ON "public"."events"
  FOR SELECT
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "events_update" ON "public"."events"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "expense_categories_delete" ON "public"."expense_categories"
  FOR DELETE
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "expense_categories_insert" ON "public"."expense_categories"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "expense_categories_select" ON "public"."expense_categories"
  FOR SELECT
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "expense_categories_update" ON "public"."expense_categories"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "expenses_delete" ON "public"."expenses"
  FOR DELETE
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "expenses_insert" ON "public"."expenses"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "expenses_select" ON "public"."expenses"
  FOR SELECT
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "expenses_update" ON "public"."expenses"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "members_delete" ON "public"."household_members"
  FOR DELETE
  TO "authenticated"
  USING (((user_id = auth.uid()) OR public.is_household_owner(household_id)));

CREATE POLICY "members_select" ON "public"."household_members"
  FOR SELECT
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "households_delete" ON "public"."households"
  FOR DELETE
  TO "authenticated"
  USING (public.is_household_owner(id));

CREATE POLICY "households_select" ON "public"."households"
  FOR SELECT
  TO "authenticated"
  USING (public.is_household_member(id));

CREATE POLICY "households_update" ON "public"."households"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_household_owner(id))
  WITH CHECK (public.is_household_owner(id));

CREATE POLICY "meal_plans_delete" ON "public"."meal_plans"
  FOR DELETE
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "meal_plans_insert" ON "public"."meal_plans"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "meal_plans_select" ON "public"."meal_plans"
  FOR SELECT
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "meal_plans_update" ON "public"."meal_plans"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "profiles_select" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.household_members me
     JOIN public.household_members other ON ((other.household_id = me.household_id)))
  WHERE ((me.user_id = auth.uid()) AND (other.user_id = profiles.id))))));

CREATE POLICY "profiles_update" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));

CREATE POLICY "shopping_items_delete" ON "public"."shopping_items"
  FOR DELETE
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "shopping_items_insert" ON "public"."shopping_items"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "shopping_items_select" ON "public"."shopping_items"
  FOR SELECT
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "shopping_items_update" ON "public"."shopping_items"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "shopping_lists_delete" ON "public"."shopping_lists"
  FOR DELETE
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "shopping_lists_insert" ON "public"."shopping_lists"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "shopping_lists_select" ON "public"."shopping_lists"
  FOR SELECT
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "shopping_lists_update" ON "public"."shopping_lists"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "tasks_delete" ON "public"."tasks"
  FOR DELETE
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "tasks_insert" ON "public"."tasks"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "tasks_select" ON "public"."tasks"
  FOR SELECT
  TO "authenticated"
  USING (public.is_household_member(household_id));

CREATE POLICY "tasks_update" ON "public"."tasks"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."events";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."expenses";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."shopping_items";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."tasks";

GRANT EXECUTE ON FUNCTION "public"."create_household"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."create_household"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_household"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_household"(text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."ensure_my_profile"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."ensure_my_profile"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."ensure_my_profile"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."ensure_my_profile"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_household_member"(uuid) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_household_member"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_household_member"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_household_member"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_household_owner"(uuid) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."is_household_owner"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_household_owner"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_household_owner"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."join_household"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."join_household"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."join_household"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."join_household"(text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."tasks_set_completed_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."tasks_set_completed_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."tasks_set_completed_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."tasks_set_completed_at"() TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_categories" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."expense_categories" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_categories" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expense_categories" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."expenses" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."household_members" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."household_members" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."household_members" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."household_members" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."households" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."households" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."households" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."households" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."meal_plans" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."meal_plans" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."meal_plans" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."meal_plans" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shopping_items" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."shopping_items" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shopping_items" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shopping_items" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shopping_lists" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."shopping_lists" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shopping_lists" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shopping_lists" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."tasks" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "service_role";

ALTER TABLE "public"."events"
  ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_paid_by_fkey" FOREIGN KEY (paid_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."households"
  ADD CONSTRAINT "households_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."meal_plans"
  ADD COLUMN "created_by" uuid DEFAULT auth.uid();

ALTER TABLE "public"."meal_plans"
  ADD CONSTRAINT "meal_plans_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."shopping_lists"
  ADD CONSTRAINT "shopping_lists_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."tasks"
  ADD COLUMN "created_by" uuid DEFAULT auth.uid();

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

