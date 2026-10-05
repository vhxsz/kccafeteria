import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { TableTagManager } from "@/components/table-tag-manager";
import { getAdminContext } from "@/lib/auth/admin-context";

export const metadata: Metadata = {
  title: "Tables and tags",
};
export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const context = await getAdminContext();
  if (!context) redirect("/login?next=/admin/tables");
  return (
    <AdminShell>
      <TableTagManager />
    </AdminShell>
  );
}
