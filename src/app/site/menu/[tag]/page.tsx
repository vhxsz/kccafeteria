import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentMenu } from "@/components/student-menu";
import { getMonday, getStudentWeekMenu } from "@/lib/cafeteria/get-week-menu";

export const metadata: Metadata = {
  title: "Weekly cafeteria menu",
  description: "See this week's school cafeteria breakfast, lunch, and dinner menus.",
};

export default async function StudentMenuPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const menu = await getStudentWeekMenu(tag, getMonday());
  if (!menu) notFound();
  return <StudentMenu menu={menu} />;
}
