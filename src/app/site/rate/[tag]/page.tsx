import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentReview } from "@/components/student-review";
import { getTableExperience } from "@/lib/cafeteria/get-experience";

export const metadata: Metadata = {
  title: "Rate your meal",
  description: "Share quick, private feedback about today's cafeteria meal.",
};

export default async function RateTablePage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const experience = await getTableExperience(tag);

  if (!experience) {
    notFound();
  }

  return <StudentReview experience={experience} />;
}
