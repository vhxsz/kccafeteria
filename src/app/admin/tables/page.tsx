import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { TableTagManager } from "@/components/table-tag-manager";

export const metadata: Metadata = {
  title: "Tables and tags",
};

export default function TablesPage() {
  return (
    <AdminShell>
      <TableTagManager />
    </AdminShell>
  );
}
