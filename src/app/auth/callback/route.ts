import { NextRequest, NextResponse } from "next/server";
import { isKingswayGoogleStudent, safeStudentDestination } from "@/lib/auth/student";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const next = safeStudentDestination(request.nextUrl.searchParams.get("next"));
  const loginUrl = new URL("/student/login", request.url);
  loginUrl.searchParams.set("next", next);
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    loginUrl.searchParams.set("error", "sign_in_failed");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    loginUrl.searchParams.set("error", "sign_in_failed");
    return NextResponse.redirect(loginUrl);
  }

  if (!isKingswayGoogleStudent(data.user)) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "school_account_required");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
