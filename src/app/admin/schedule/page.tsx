import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { WeeklyPlanner } from "@/components/weekly-planner";
import { getAdminContext } from "@/lib/auth/admin-context";

export const metadata: Metadata = {
  title: "Weekly meal planner",
};
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const context = await getAdminContext();
  if (!context) redirect("/login?next=/admin/schedule");
  return (
    <AdminShell>
      <WeeklyPlanner />
    </AdminShell>
  );
}
