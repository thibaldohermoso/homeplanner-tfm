import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type DeletePayload = { confirmation?: string; password?: string };

export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "La eliminación de cuentas no está habilitada en este entorno." }, { status: 503 });
  }

  let payload: DeletePayload;
  try {
    payload = await request.json() as DeletePayload;
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }

  if (payload.confirmation !== "ELIMINAR" || !payload.password) {
    return NextResponse.json({ error: "Escribe ELIMINAR y tu contraseña actual para continuar." }, { status: 400 });
  }

  const sessionClient = await createClient();
  const { data: userData, error: userError } = await sessionClient.auth.getUser();
  const user = userData.user;
  if (userError || !user?.email) {
    return NextResponse.json({ error: "Tu sesión ha caducado. Inicia sesión de nuevo." }, { status: 401 });
  }

  const { error: passwordError } = await sessionClient.auth.signInWithPassword({ email: user.email, password: payload.password });
  if (passwordError) {
    return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
  }

  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: memberships, error: membershipsError } = await admin
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id);
  if (membershipsError) {
    return NextResponse.json({ error: "No se han podido comprobar tus hogares." }, { status: 500 });
  }

  const householdSizes = await Promise.all((memberships ?? []).map(async (membership) => {
    const { count, error } = await admin
      .from("household_members")
      .select("user_id", { count: "exact", head: true })
      .eq("household_id", membership.household_id);
    return { ...membership, count: count ?? 0, error };
  }));
  if (householdSizes.some((household) => household.error)) {
    return NextResponse.json({ error: "No se han podido comprobar los miembros de tus hogares." }, { status: 500 });
  }

  const sharedHousehold = householdSizes.find((household) => household.count > 1);
  if (sharedHousehold) {
    return NextResponse.json({ error: "No puedes eliminar la cuenta mientras compartas un hogar. Sal del hogar o elimínalo primero." }, { status: 409 });
  }

  for (const household of householdSizes) {
    const { error } = await admin.from("households").delete().eq("id", household.household_id);
    if (error) {
      return NextResponse.json({ error: "No se ha podido eliminar uno de tus hogares. No se ha eliminado la cuenta." }, { status: 500 });
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: "No se ha podido eliminar la cuenta." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
