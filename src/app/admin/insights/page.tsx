import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { RankingsDashboard } from "@/components/rankings-dashboard";
import { getAdminContext } from "@/lib/auth/admin-context";
import { getSchoolRankings, parseRankingPeriod, parseRankingSort } from "@/lib/rankings";

export const metadata: Metadata = { title: "Food & day insights" };
export const dynamic = "force-dynamic";

export default async function AdminInsightsPage({ searchParams }: {
  searchParams: Promise<{ days?: string; sort?: string }>;
}) {
  const context = await getAdminContext();
  if (!context) redirect("/login?next=/admin/insights");
  const { data: tag, error } = await context.supabase.from("cafeteria_tables")
    .select("tag_code")
    .eq("school_id", context.schoolId)
    .eq("cafeteria_id", context.cafeteriaId)
    .eq("active", true)
    .order("table_number")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not find the cafeteria tag for insights.");
  const params = await searchParams;
  const period = parseRankingPeriod(params.days);
  const sort = parseRankingSort(params.sort);
  if (!tag) return <AdminShell><div className="mx-auto max-w-3xl px-6 py-16"><h1 className="text-3xl font-bold">Insights need an active table</h1><p className="mt-3 text-ink/60">Create a table tag to connect reviews to this cafeteria.</p><Link href="/admin/tables" className="mt-6 inline-block rounded-full bg-moss px-5 py-3 font-bold text-white">Manage tables & tags</Link></div></AdminShell>;
  const rankings = await getSchoolRankings(tag.tag_code, period, "admin");
  if (!rankings) throw new Error("Insights could not be loaded for this cafeteria.");
  return <AdminShell><RankingsDashboard rankings={rankings} audience="admin" period={period} sort={sort} basePath="/admin/insights" /></AdminShell>;
}
