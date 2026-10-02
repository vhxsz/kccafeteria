import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentMenu } from "@/components/student-menu";
import { getMonday, getStudentWeekMenu } from "@/lib/cafeteria/get-week-menu";

export const metadata: Metadata = {
  title: "Weekly cafeteria menu",
  description: "See this week's school cafeteria breakfast, lunch, and dinner menus.",
  alternates: { canonical: "/menu" },
};

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const publicMenuTag = process.env.NEXT_PUBLIC_DEFAULT_MENU_TAG || "tag14";
  const menu = await getStudentWeekMenu(publicMenuTag, getMonday());

  if (!menu) notFound();

  return <StudentMenu menu={menu} />;
}
