import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  MessageSquareText,
  Star,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminContext } from "@/lib/auth/admin-context";

export const metadata: Metadata = {
  title: "Reviews",
};

type ReviewRecord = {
  id: string;
  overall_rating: number;
  comment: string | null;
  created_at: string;
  meal_period_id: string;
  table_id: string | null;
};

function localDateKey(value: Date | string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function score(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

export default async function ReviewsPage() {
  const context = await getAdminContext();
  if (!context) redirect("/login?next=/admin/reviews");

  const [schoolResult, reviewsResult, mealsResult, tablesResult] = await Promise.all([
    context.supabase.from("schools").select("timezone").eq("id", context.schoolId).single(),
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

  const reviews = (reviewsResult.data || []) as ReviewRecord[];
  const reviewIds = reviews.map((review) => review.id);
  const [reviewTagsResult, tagsResult, reviewItemsResult, foodsResult] = reviewIds.length
    ? await Promise.all([
        context.supabase
          .from("review_tags")
          .select("review_id, tag_id")
          .eq("school_id", context.schoolId)
          .in("review_id", reviewIds),
        context.supabase
          .from("feedback_tags")
          .select("id, name")
          .eq("school_id", context.schoolId),
        context.supabase
          .from("review_items")
          .select("review_id, food_item_id, rating")
          .eq("school_id", context.schoolId)
          .in("review_id", reviewIds),
        context.supabase
          .from("food_items")
          .select("id, name")
          .eq("school_id", context.schoolId),
      ])
    : [
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
      ];

  const timezone = schoolResult.data?.timezone || "America/Toronto";
  const todayKey = localDateKey(new Date(), timezone);
  const now = new Date().getTime();
  const weekStart = now - 6 * 24 * 60 * 60 * 1000;
  const todayReviews = reviews.filter(
    (review) => localDateKey(review.created_at, timezone) === todayKey,
  );
  const weekReviews = reviews.filter(
    (review) => new Date(review.created_at).getTime() >= weekStart,
  );

  const mealNames = new Map((mealsResult.data || []).map((meal) => [meal.id, meal.name]));
  const tableNumbers = new Map(
    (tablesResult.data || []).map((table) => [table.id, table.table_number]),
  );
  const tagNames = new Map((tagsResult.data || []).map((tag) => [tag.id, tag.name]));
  const foodNames = new Map((foodsResult.data || []).map((food) => [food.id, food.name]));

  const tagsByReview = new Map<string, string[]>();
  for (const relation of reviewTagsResult.data || []) {
    const name = tagNames.get(relation.tag_id);
    if (!name) continue;
    const current = tagsByReview.get(relation.review_id) || [];
    current.push(name);
    tagsByReview.set(relation.review_id, current);
  }

  const itemsByReview = new Map<string, Array<{ name: string; rating: number }>>();
  for (const item of reviewItemsResult.data || []) {
    if (!item.rating) continue;
    const current = itemsByReview.get(item.review_id) || [];
    current.push({
      name: foodNames.get(item.food_item_id) || "Menu item",
      rating: item.rating,
    });
    itemsByReview.set(item.review_id, current);
  }

  const metrics = [
    {
      label: "Overall rating",
      value: score(average(reviews.map((review) => review.overall_rating))),
      detail: `${reviews.length} total review${reviews.length === 1 ? "" : "s"}`,
      icon: Star,
    },
    {
      label: "This week",
      value: score(average(weekReviews.map((review) => review.overall_rating))),
      detail: `${weekReviews.length} in the last 7 days`,
      icon: TrendingUp,
    },
    {
      label: "Today",
      value: score(average(todayReviews.map((review) => review.overall_rating))),
      detail: `${todayReviews.length} review${todayReviews.length === 1 ? "" : "s"} today`,
      icon: CalendarDays,
    },
    {
      label: "With comments",
      value: String(reviews.filter((review) => review.comment).length),
      detail: "Written student feedback",
      icon: MessageSquareText,
    },
  ];

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1500px] p-5 sm:p-8 lg:p-10">
        <p className="text-sm font-semibold text-tomato">Student feedback</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
          Reviews
        </h1>
        <p className="mt-2 max-w-2xl text-ink/50">
          See every published review and track today, this week, and overall performance.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <article
              key={metric.label}
              className={
                "rounded-3xl border border-ink/8 p-5 shadow-sm " +
                (index === 0 ? "bg-moss text-white" : "bg-white")
              }
            >
              <div className="flex items-start justify-between">
                <p className={index === 0 ? "text-sm text-white/65" : "text-sm text-ink/50"}>
                  {metric.label}
                </p>
                <metric.icon size={19} className={index === 0 ? "text-white/70" : "text-moss"} />
              </div>
              <p className="mt-6 text-4xl font-bold tracking-[-0.05em]">{metric.value}</p>
              <p className={index === 0 ? "mt-2 text-xs text-white/50" : "mt-2 text-xs text-ink/40"}>
                {metric.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-ink/8 px-5 py-5 sm:px-7">
            <div>
              <p className="text-sm text-ink/45">Newest first</p>
              <h2 className="mt-1 text-xl font-bold">All reviews</h2>
            </div>
            <span className="rounded-full bg-sun px-3 py-1.5 text-xs font-bold text-moss">
              {reviews.length} total
            </span>
          </div>

          {reviews.length ? (
            <div className="divide-y divide-ink/8">
              {reviews.map((review) => {
                const tableNumber = review.table_id
                  ? tableNumbers.get(review.table_id)
                  : undefined;
                const reviewItems = itemsByReview.get(review.id) || [];
                return (
                  <article
                    key={review.id}
                    className="grid gap-5 px-5 py-6 sm:px-7 lg:grid-cols-[110px_150px_1fr_auto] lg:items-start"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 text-lg font-bold">
                        <Star size={18} className="fill-tomato text-tomato" />
                        {review.overall_rating}.0
                      </div>
                      <p className="mt-1 text-xs text-ink/40">
                        {mealNames.get(review.meal_period_id) || "Meal"}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold">
                        {tableNumber ? `Table ${tableNumber}` : "Anonymous table"}
                      </p>
                      <p className="mt-1 text-xs text-ink/40">
                        {new Intl.DateTimeFormat("en-CA", {
                          timeZone: timezone,
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(review.created_at))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm leading-6 text-ink/80">
                        {review.comment || "No written comment."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(tagsByReview.get(review.id) || []).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-sage/30 px-2.5 py-1 text-xs font-semibold text-moss"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {reviewItems.length ? (
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink/55">
                          {reviewItems.map((item) => (
                            <span key={item.name} className="inline-flex items-center gap-1">
                              <UtensilsCrossed size={13} /> {item.name}: {item.rating}.0
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <MessageSquareText size={28} className="mx-auto text-moss" />
              <h3 className="mt-4 text-lg font-bold">No reviews yet</h3>
              <p className="mt-2 text-sm text-ink/50">
                Published student feedback will appear here automatically.
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
