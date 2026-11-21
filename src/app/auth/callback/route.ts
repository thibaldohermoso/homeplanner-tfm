import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const redirectUrl = new URL(next, url.origin);
  if (!code) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "callback");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const failureUrl = new URL("/login", url.origin);
    failureUrl.searchParams.set("error", "callback");
    return NextResponse.redirect(failureUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  if (next === "/reset-password") {
    response.cookies.set("homeplanner-recovery", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
  }
  return response;
}
