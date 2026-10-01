import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { SchoolSettings } from "@/components/school-settings";

export const metadata: Metadata = { title: "School settings" };

export default function SettingsPage() {
  return (
    <AdminShell>
      <SchoolSettings />
    </AdminShell>
  );
}
