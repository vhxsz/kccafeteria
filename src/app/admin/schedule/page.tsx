import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { WeeklyPlanner } from "@/components/weekly-planner";

export const metadata: Metadata = {
  title: "Weekly meal planner",
};

export default function SchedulePage() {
  return (
    <AdminShell>
      <WeeklyPlanner />
    </AdminShell>
  );
}
