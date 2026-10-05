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
export const dynamic = "force-dynamic";

type ReviewRecord = {
  id: string;
  overall_rating: number;
  comment: string | null;
  created_at: string;
  meal_period_id: string;
  table_id: string | null;
};

type FoodRecord = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
};

type ReviewItemRecord = {
  review_id: string;
  food_item_id: string;
  rating: number | null;
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
  const baseError =
    schoolResult.error || reviewsResult.error || mealsResult.error || tablesResult.error;
  if (baseError) throw new Error("Review data could not be loaded.");
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
          .select("id, name, category, image_url")
          .eq("school_id", context.schoolId),
      ])
    : [
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
      ];

  const detailError =
    "error" in reviewTagsResult && reviewTagsResult.error ||
    "error" in tagsResult && tagsResult.error ||
    "error" in reviewItemsResult && reviewItemsResult.error ||
    "error" in foodsResult && foodsResult.error;
  if (detailError) throw new Error("Review details could not be loaded.");

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
  const foods = (foodsResult.data || []) as FoodRecord[];
  const reviewItems = (reviewItemsResult.data || []) as ReviewItemRecord[];
  const foodDetails = new Map(foods.map((food) => [food.id, food]));

  const tagsByReview = new Map<string, string[]>();
  for (const relation of reviewTagsResult.data || []) {
    const name = tagNames.get(relation.tag_id);
    if (!name) continue;
    const current = tagsByReview.get(relation.review_id) || [];
    current.push(name);
    tagsByReview.set(relation.review_id, current);
  }

  const itemsByReview = new Map<string, Array<{ name: string; rating: number }>>();
  for (const item of reviewItems) {
    if (!item.rating) continue;
    const current = itemsByReview.get(item.review_id) || [];
    current.push({
      name: foodDetails.get(item.food_item_id)?.name || "Menu item",
      rating: item.rating,
    });
    itemsByReview.set(item.review_id, current);
  }

  const ratingTotals = new Map<string, { total: number; count: number }>();
  for (const item of reviewItems) {
    if (!item.rating) continue;
    const current = ratingTotals.get(item.food_item_id) || { total: 0, count: 0 };
    current.total += item.rating;
    current.count += 1;
    ratingTotals.set(item.food_item_id, current);
  }

  const rankedFoods = Array.from(ratingTotals.entries())
    .map(([foodItemId, totals]) => {
      const food = foodDetails.get(foodItemId);
      return {
        id: foodItemId,
        name: food?.name || "Menu item",
        category: food?.category || "other",
        imageUrl: food?.image_url,
        average: totals.total / totals.count,
        votes: totals.count,
      };
    })
    .sort(
      (first, second) =>
        second.average - first.average ||
        second.votes - first.votes ||
        first.name.localeCompare(second.name),
    );
  const unratedFoodCount = Math.max(foods.length - rankedFoods.length, 0);

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
          <div className="flex flex-col gap-3 border-b border-ink/8 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-sm text-ink/45">Highest to lowest · all time</p>
              <h2 className="mt-1 text-xl font-bold">Food ranking</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-sun px-3 py-1.5 text-moss">
                {rankedFoods.length} rated dish{rankedFoods.length === 1 ? "" : "es"}
              </span>
              {unratedFoodCount ? (
                <span className="rounded-full bg-ink/5 px-3 py-1.5 text-ink/45">
                  {unratedFoodCount} awaiting ratings
                </span>
              ) : null}
            </div>
          </div>

          {rankedFoods.length ? (
            <ol className="divide-y divide-ink/8">
              {rankedFoods.map((food, index) => (
                <li
                  key={food.id}
                  className="grid grid-cols-[42px_52px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[48px_56px_minmax(0,1fr)_130px_auto] sm:gap-4 sm:px-7"
                >
                  <span
                    className={
                      "grid h-9 w-9 place-items-center rounded-full text-sm font-bold " +
                      (index === 0
                        ? "bg-moss text-white"
                        : index < 3
                          ? "bg-sun text-moss"
                          : "bg-ink/5 text-ink/55")
                    }
                    aria-label={`Rank ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                  <div
                    className="h-12 w-12 rounded-2xl bg-sage/30 bg-cover bg-center sm:h-14 sm:w-14"
                    style={food.imageUrl ? { backgroundImage: `url(${food.imageUrl})` } : undefined}
                    role={food.imageUrl ? "img" : undefined}
                    aria-label={food.imageUrl ? food.name : undefined}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{food.name}</p>
                    <p className="mt-1 text-xs capitalize text-ink/40">
                      {food.category.replaceAll("_", " ")} · {food.votes} vote
                      {food.votes === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                      <div
                        className="h-full rounded-full bg-tomato"
                        style={{ width: `${(food.average / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex min-w-14 items-center justify-end gap-1 font-bold tabular-nums">
                    <Star size={16} className="fill-tomato text-tomato" />
                    {food.average.toFixed(1)}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="px-6 py-12 text-center">
              <UtensilsCrossed size={28} className="mx-auto text-moss" />
              <h3 className="mt-4 text-lg font-bold">No food ratings yet</h3>
              <p className="mt-2 text-sm text-ink/50">
                The ranking will appear after students rate individual items.
              </p>
            </div>
          )}
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
