import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MessageSquareText, Star, TrendingUp, UtensilsCrossed } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminContext } from "@/lib/auth/admin-context";

export const metadata: Metadata = { title: "Overview" };

type ReviewRecord = {
  id: string;
  overall_rating: number;
  comment: string | null;
  created_at: string;
  meal_period_id: string;
  table_id: string | null;
};

function dateKey(value: Date | string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function displayScore(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

export default async function AdminDashboard() {
  const context = await getAdminContext();
  if (!context) redirect("/login?next=/admin");

  const [schoolResult, reviewsResult, mealsResult, tablesResult] = await Promise.all([
    context.supabase.from("schools").select("name, timezone").eq("id", context.schoolId).single(),
    context.supabase
      .from("reviews")
      .select("id, overall_rating, comment, created_at, meal_period_id, table_id")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(500),
    context.supabase
      .from("meal_periods")
      .select("id, name")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId),
    context.supabase
      .from("cafeteria_tables")
      .select("id, table_number")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId),
  ]);

  const loadError = schoolResult.error || reviewsResult.error || mealsResult.error || tablesResult.error;
  if (loadError) throw new Error("The dashboard data could not be loaded.");

  const timezone = schoolResult.data.timezone || "America/Toronto";
  const reviews = (reviewsResult.data || []) as ReviewRecord[];
  const now = new Date();
  const today = dateKey(now, timezone);
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(now, index - 6);
    return {
      key: dateKey(day, timezone),
      label: new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(day),
    };
  });
  const weekKeys = new Set(lastSevenDays.map((day) => day.key));
  const todayReviews = reviews.filter((review) => dateKey(review.created_at, timezone) === today);
  const weekReviews = reviews.filter((review) => weekKeys.has(dateKey(review.created_at, timezone)));
  const mealNames = new Map((mealsResult.data || []).map((meal) => [meal.id, meal.name]));
  const tableNumbers = new Map((tablesResult.data || []).map((table) => [table.id, table.table_number]));

  const metrics = [
    {
      label: "Today's reviews",
      value: String(todayReviews.length),
      detail: "Published feedback received today",
      icon: MessageSquareText,
    },
    {
      label: "Today's rating",
      value: displayScore(average(todayReviews.map((review) => review.overall_rating))),
      detail: todayReviews.length ? "Average across today's reviews" : "Waiting for today's first review",
      icon: Star,
    },
    {
      label: "7-day rating",
      value: displayScore(average(weekReviews.map((review) => review.overall_rating))),
      detail: `${weekReviews.length} review${weekReviews.length === 1 ? "" : "s"} in 7 days`,
      icon: TrendingUp,
    },
    {
      label: "Satisfaction",
      value: reviews.length
        ? `${Math.round((reviews.filter((review) => review.overall_rating >= 4).length / reviews.length) * 100)}%`
        : "—",
      detail: "Share of all ratings at 4 or 5 stars",
      icon: CalendarDays,
    },
  ];

  const trend = lastSevenDays.map((day) => {
    const daily = reviews.filter((review) => dateKey(review.created_at, timezone) === day.key);
    return { ...day, value: average(daily.map((review) => review.overall_rating)), count: daily.length };
  });
  const mealScores = (mealsResult.data || []).map((meal) => {
    const matching = todayReviews.filter((review) => review.meal_period_id === meal.id);
    return { name: meal.name, score: average(matching.map((review) => review.overall_rating)), count: matching.length };
  });
  const bestMeal = mealScores
    .filter((meal) => meal.score !== null)
    .sort((first, second) => (second.score || 0) - (first.score || 0))[0];
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1500px] p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-tomato">{formattedDate}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Cafeteria overview</h1>
            <p className="mt-2 text-ink/50">Live feedback for {schoolResult.data.name}.</p>
          </div>
          <Link href="/site/rate/tag14" className="inline-flex items-center justify-center rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-bold shadow-sm">
            Preview student view
          </Link>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <article key={metric.label} className={`rounded-3xl border border-ink/8 p-5 shadow-sm ${index === 0 ? "bg-moss text-white" : "bg-white"}`}>
              <div className="flex items-start justify-between">
                <p className={index === 0 ? "text-sm text-white/65" : "text-sm text-ink/50"}>{metric.label}</p>
                <metric.icon size={19} className={index === 0 ? "text-white/70" : "text-moss"} />
              </div>
              <p className="mt-6 text-4xl font-bold tracking-[-0.05em]">{metric.value}</p>
              <p className={index === 0 ? "mt-2 text-xs text-white/50" : "mt-2 text-xs text-ink/40"}>{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <article className="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm text-ink/45">Average rating</p>
            <h2 className="mt-1 text-xl font-bold">Last 7 days</h2>
            <div className="mt-8 flex h-52 items-end gap-3 sm:gap-5">
              {trend.map((day) => (
                <div key={day.key} className="flex h-full flex-1 flex-col justify-end gap-3 text-center">
                  <div className="relative flex min-h-2 w-full items-start justify-center rounded-t-xl bg-sage" style={{ height: `${day.value ? Math.max((day.value / 5) * 100, 8) : 4}%` }} title={day.count ? `${day.value?.toFixed(1)} from ${day.count} review${day.count === 1 ? "" : "s"}` : "No reviews"}>
                    {day.value ? <span className="-translate-y-6 text-[11px] font-bold text-ink/50">{day.value.toFixed(1)}</span> : null}
                  </div>
                  <span className="text-xs font-medium text-ink/35">{day.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm text-ink/45">Today&apos;s service</p>
            <h2 className="mt-1 text-xl font-bold">Meal comparison</h2>
            <div className="mt-7 space-y-6">
              {mealScores.map((meal) => (
                <div key={meal.name}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold">{meal.name}</span>
                    <span className="font-bold">{displayScore(meal.score)} <span className="font-normal text-ink/35">({meal.count})</span></span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-cream">
                    <div className="h-full rounded-full bg-moss" style={{ width: `${meal.score ? (meal.score / 5) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-2 rounded-2xl bg-sun/20 p-4 text-sm">
              <Star size={17} className="fill-sun text-sun" />
              {bestMeal ? `${bestMeal.name} is today's highest-rated meal.` : "Meal results will appear after today's first review."}
            </div>
          </article>
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-ink/8 px-5 py-5 sm:px-7">
            <div><p className="text-sm text-ink/45">Newest first</p><h2 className="mt-1 text-xl font-bold">Recent reviews</h2></div>
            <Link href="/admin/reviews" className="text-sm font-bold text-moss">View all</Link>
          </div>
          {reviews.length ? (
            <div className="divide-y divide-ink/8">
              {reviews.slice(0, 5).map((review) => (
                <article key={review.id} className="grid gap-4 px-5 py-5 sm:px-7 md:grid-cols-[90px_130px_1fr_auto] md:items-center">
                  <div className="flex items-center gap-1 font-bold"><Star size={16} className="fill-tomato text-tomato" />{review.overall_rating}.0</div>
                  <div className="text-xs text-ink/45"><p className="font-bold text-ink/70">{mealNames.get(review.meal_period_id) || "Meal"}</p><p>{review.table_id ? `Table ${tableNumbers.get(review.table_id) || "—"}` : "Anonymous"}</p></div>
                  <p className="text-sm leading-6 text-ink/70">{review.comment || "No written comment."}</p>
                  <time className="text-xs text-ink/35" dateTime={review.created_at}>{new Intl.DateTimeFormat("en-CA", { timeZone: timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(review.created_at))}</time>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center"><UtensilsCrossed size={28} className="mx-auto text-moss" /><p className="mt-3 font-bold">No reviews yet</p><p className="mt-1 text-sm text-ink/45">Student feedback will appear here automatically.</p></div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
