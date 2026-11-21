import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentMenu } from "@/components/student-menu";
import { getMonday, getStudentWeekMenu } from "@/lib/cafeteria/get-week-menu";
import { getPublicTag } from "@/lib/cafeteria/public-tag";

export const metadata: Metadata = {
  title: "Weekly cafeteria menu",
  description: "See this week's school cafeteria breakfast, lunch, and dinner menus.",
  alternates: { canonical: "/menu" },
};

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const publicMenuTag = await getPublicTag();
  if (!publicMenuTag) notFound();
  const menu = await getStudentWeekMenu(publicMenuTag, getMonday());

  if (!menu) notFound();

  return <StudentMenu menu={menu} />;
}
