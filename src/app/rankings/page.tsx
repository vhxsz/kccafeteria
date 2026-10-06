import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { RankingsDashboard } from "@/components/rankings-dashboard";
import { getSchoolRankings, parseRankingPeriod, parseRankingSort } from "@/lib/rankings";

export const metadata: Metadata = {
  title: "Food rankings",
  description: "Explore Kingsway College cafeteria favorites and the best-rated days of the week.",
  alternates: { canonical: "/rankings" },
};
export const dynamic = "force-dynamic";

export default async function PublicRankingsPage({ searchParams }: {
  searchParams: Promise<{ days?: string; sort?: string; top?: string }>;
}) {
  const params = await searchParams;
  const period = parseRankingPeriod(params.days);
  const sort = parseRankingSort(params.sort);
  const foodLimit = params.top === "10" ? 10 : 5;
  const rankings = await getSchoolRankings(process.env.NEXT_PUBLIC_DEFAULT_MENU_TAG || "tag14", period, "public");
  if (!rankings) notFound();

  return <main className="min-h-screen bg-[#f8f6f7] text-ink">
    <header className="border-b border-ink/10 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10"><BrandMark /><div className="flex items-center gap-3 text-xs font-bold sm:text-sm"><Link href="/menu" className="rounded-full px-3 py-2 text-ink/60 hover:text-moss">Weekly menu</Link><Link href="/" className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-3 py-2 hover:text-moss"><ChevronLeft size={16} /> Home</Link></div></div></header>
    <RankingsDashboard rankings={rankings} audience="public" period={period} sort={sort} basePath="/rankings" foodLimit={foodLimit} />
  </main>;
}
