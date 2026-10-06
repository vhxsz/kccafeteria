import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentGoogleLogin } from "@/components/student-google-login";
import { isKingswayGoogleStudent, safeStudentDestination } from "@/lib/auth/student";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Student sign in" };
export const dynamic = "force-dynamic";

export default async function StudentLoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeStudentDestination(params.next);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (isKingswayGoogleStudent(user)) redirect(next);

  return <div>
    <p className="text-sm font-bold text-moss">Kingsway College students</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Sign in to rate your meal.</h1>
    <p className="mt-4 leading-7 text-ink/60">Use your school Google account ending in <strong>@kingsway.college</strong>. One review is allowed per person for each meal.</p>
    {params.error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{params.error === "school_account_required" ? "Only verified @kingsway.college Google accounts can vote." : "Sign-in could not be completed. Please try again."}</p> : null}
    <StudentGoogleLogin next={next} />
    <p className="mt-6 text-center text-xs leading-5 text-ink/45">Your email is used to prevent duplicate votes. It is not shown in public rankings.</p>
    <Link href="/menu" className="mt-7 block text-center text-sm font-bold text-moss hover:underline">View the menu without signing in</Link>
  </div>;
}
