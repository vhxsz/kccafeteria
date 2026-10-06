import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StudentReview } from "@/components/student-review";
import { StudentSignOut } from "@/components/student-sign-out";
import { isKingswayGoogleStudent } from "@/lib/auth/student";
import { getTableExperience } from "@/lib/cafeteria/get-experience";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isKingswayGoogleStudent(user)) {
    redirect(`/student/login?next=${encodeURIComponent(`/site/rate/${tag}`)}`);
  }

  if (experience.menuId) {
    const { data: alreadyReviewed, error } = await supabase.rpc("has_reviewed_menu", {
      p_menu_id: experience.menuId,
    });
    if (error) throw new Error("Could not check your meal feedback status.");
    if (alreadyReviewed) return <main className="grid min-h-screen place-items-center bg-cream px-5 text-ink"><section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-sm"><p className="text-sm font-bold uppercase tracking-widest text-moss">Feedback received</p><h1 className="mt-3 text-3xl font-bold">You already rated this meal.</h1><p className="mt-3 text-ink/60">Each Kingsway account can submit one review per meal. Thank you for helping the cafeteria improve.</p><Link href="/menu" className="mt-7 inline-block rounded-full bg-moss px-6 py-3 font-bold text-white">View the weekly menu</Link><div className="mt-5 flex justify-center"><StudentSignOut next={`/site/rate/${tag}`} /></div></section></main>;
  }

  return <StudentReview experience={experience} />;
}
