import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { SchoolSettings } from "@/components/school-settings";
import { getAdminContext } from "@/lib/auth/admin-context";

export const metadata: Metadata = { title: "School settings" };

export default async function SettingsPage() {
  const context = await getAdminContext();
  if (!context) redirect("/login?next=/admin/settings");
  return (
    <AdminShell>
      <SchoolSettings />
    </AdminShell>
  );
}
