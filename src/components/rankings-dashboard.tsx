import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, Star, Trophy, Users } from "lucide-react";
import type { RankingFood, RankingPeriod, SchoolRankings } from "@/lib/rankings";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const categoryNames: Record<string, string> = {
  main_dish: "Main dishes", side: "Sides", salad: "Salads", dessert: "Desserts",
  fruit: "Fruit", bread: "Bread", drink: "Drinks", other: "Other",
};

function score(value: number | null | undefined) {
  return value == null ? "—" : Number(value).toFixed(2);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function query(period: RankingPeriod, sort: "rating" | "votes", foodLimit?: 5 | 10) {
  const params = new URLSearchParams({ sort });
  if (period) params.set("days", String(period));
  if (foodLimit === 10) params.set("top", "10");
  return `?${params.toString()}`;
}

function StarBars({ distribution }: { distribution: number[] | null }) {
  if (!distribution) return null;
  const total = distribution.reduce((sum, count) => sum + count, 0);
  return (
    <div className="space-y-1.5" aria-label="Rating distribution">
      {[5, 4, 3, 2, 1].map((stars) => (
        <div key={stars} className="flex items-center gap-2 text-xs text-ink/55">
          <span className="w-7 text-right">{stars}★</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/8">
            <div className="h-full rounded-full bg-moss" style={{ width: `${total ? distribution[stars - 1] / total * 100 : 0}%` }} />
          </div>
          <span className="w-7 text-right tabular-nums">{distribution[stars - 1]}</span>
        </div>
      ))}
    </div>
  );
}

function FoodCard({ food, rank, detailed }: { food: RankingFood; rank: number; detailed: boolean }) {
  const dimensions = [
    ["Taste", food.tasteRating], ["Temperature", food.temperatureRating],
    ["Portion", food.portionRating], ["Appearance", food.appearanceRating],
  ] as const;
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-ink/10 bg-white shadow-sm">
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-sage/30 sm:h-28 sm:w-28">
          {food.imageUrl ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${food.imageUrl})` }} /> : <div className="grid h-full place-items-center text-3xl">🍽️</div>}
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-xs font-black text-moss shadow">#{rank}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[.13em] text-moss">{categoryNames[food.category] || food.category}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight">{food.name}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1 font-black text-moss"><Star size={15} fill="currentColor" /> {score(food.averageRating)}</span>
            <span className="inline-flex items-center gap-1 text-ink/55"><Users size={15} /> {food.votes} item {food.votes === 1 ? "vote" : "votes"}</span>
          </div>
          <p className="mt-2 text-xs text-ink/45">{food.positivePercent}% rated 4–5 stars · Last served {dateLabel(food.lastServed)}</p>
          {food.votes < 10 ? <p className="mt-1 text-[11px] font-semibold text-amber-700">Early result · fewer than 10 item votes</p> : null}
        </div>
      </div>
      {detailed ? (
        <div className="grid gap-5 border-t border-ink/8 bg-cream/30 p-4 sm:grid-cols-2 sm:p-5">
          <StarBars distribution={food.distribution} />
          <div className="grid grid-cols-2 gap-2">
            {dimensions.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white px-3 py-2">
                <p className="text-[11px] text-ink/50">{label}</p>
                <p className="font-bold">{score(value)} <span className="text-xs font-normal text-ink/40">/ 5</span></p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function RankingsDashboard({ rankings, audience, period, sort, basePath, foodLimit = 5 }: {
  rankings: SchoolRankings;
  audience: "public" | "admin";
  period: RankingPeriod;
  sort: "rating" | "votes";
  basePath: string;
  foodLimit?: 5 | 10;
}) {
  const detailed = audience === "admin";
  const foods = [...rankings.foods].sort((a, b) => sort === "votes"
    ? b.votes - a.votes || b.averageRating - a.averageRating || a.name.localeCompare(b.name)
    : b.averageRating - a.averageRating || b.votes - a.votes || a.name.localeCompare(b.name));
  const visibleFoods = detailed ? foods : foods.slice(0, foodLimit);
  const canExpandFoods = !detailed && foods.length > 5;
  const expandLabel = foods.length >= 10 ? "Show top 10" : `Show all ${foods.length}`;
  const weekdayMap = new Map(rankings.weekdays.map((day) => [day.weekday, day]));
  const weekdayRanks = new Map(rankings.weekdays.map((day, index) => [day.weekday, index + 1]));
  const bestWeekday = rankings.weekdays[0];
  const periodOptions: Array<[RankingPeriod, string]> = [[7, "7 days"], [30, "30 days"], [90, "90 days"], [null, "All time"]];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.17em] text-moss">{detailed ? "Cafeteria intelligence" : "Kingsway community ratings"}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-.05em] sm:text-5xl">{detailed ? "Food & day insights" : "Food rankings"}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">
            {detailed ? "Explore every published rating by food, day, meal, and category." : "See what students enjoyed most. Rankings use anonymous, grouped ratings only."}
          </p>
        </div>
        {detailed ? <Link href="/rankings" className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-bold hover:text-moss">View public rankings <ArrowRight size={16} /></Link> : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-2" aria-label="Ranking period">
        {periodOptions.map(([value, label]) => (
          <Link key={label} href={`${basePath}${query(value, sort, detailed ? undefined : foodLimit)}`} className={`rounded-full px-4 py-2 text-sm font-bold ${period === value ? "bg-moss text-white" : "border border-ink/10 bg-white text-ink/60 hover:text-moss"}`}>{label}</Link>
        ))}
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Overall rating", score(rankings.summary.averageRating), "out of 5 stars"],
          ["Meal reviews", rankings.summary.reviewCount?.toLocaleString() ?? "—", "published responses"],
          ["Food votes", rankings.summary.itemVoteCount?.toLocaleString() ?? "—", "individual item ratings"],
          ["Positive ratings", rankings.summary.positivePercent == null ? "—" : `${rankings.summary.positivePercent}%`, "4 or 5 stars"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-[1.5rem] border border-ink/8 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[.1em] text-ink/45">{label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-moss">{value}</p>
            <p className="mt-1 text-xs text-ink/45">{detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-moss"><Trophy size={20} /><span className="text-xs font-black uppercase tracking-[.15em]">Student favorites</span></div>
              <h2 className="mt-2 text-2xl font-bold">{sort === "votes" ? "Most voted foods" : "Highest-rated foods"}</h2>
              {!detailed ? <p className="mt-1 text-xs text-ink/50">Showing {visibleFoods.length} of {foods.length} qualifying {foods.length === 1 ? "food" : "foods"} · At least 3 item votes required</p> : null}
            </div>
            <div className="flex rounded-full border border-ink/10 bg-white p-1 text-xs font-bold">
              <Link href={`${basePath}${query(period, "rating", detailed ? undefined : foodLimit)}`} className={`rounded-full px-3 py-2 ${sort === "rating" ? "bg-moss text-white" : "text-ink/55"}`}>Best rated</Link>
              <Link href={`${basePath}${query(period, "votes", detailed ? undefined : foodLimit)}`} className={`rounded-full px-3 py-2 ${sort === "votes" ? "bg-moss text-white" : "text-ink/55"}`}>Most votes</Link>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {visibleFoods.length ? visibleFoods.map((food, index) => <FoodCard key={food.id} food={food} rank={index + 1} detailed={detailed} />)
              : <div className="rounded-3xl border border-dashed border-ink/15 bg-white p-10 text-center text-sm text-ink/55">No food has enough ratings in this period yet.</div>}
          </div>
          {canExpandFoods ? <Link href={`${basePath}${query(period, sort, foodLimit === 5 ? 10 : 5)}`} className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-bold text-moss shadow-sm transition hover:border-moss/40 hover:bg-cream">{foodLimit === 5 ? expandLabel : "Show top 5"} <ArrowRight size={16} className={foodLimit === 10 ? "rotate-180" : ""} /></Link> : null}
        </section>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-ink/8 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-moss"><ChartNoAxesCombined size={19} /><h2 className="text-lg font-bold text-ink">Best days of the week</h2></div>
            <p className="mt-1 text-xs leading-5 text-ink/50">Based on when the meal was served, even if feedback was sent later.</p>
            <div className="mt-5 space-y-2">
              {weekdays.map((name, index) => {
                const day = weekdayMap.get(index + 1);
                return <div key={name} className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${bestWeekday?.weekday === index + 1 ? "bg-sun/45" : "bg-cream/60"}`}>
                  <div><p className="font-bold">{weekdayRanks.has(index + 1) ? `#${weekdayRanks.get(index + 1)} · ` : ""}{name}</p><p className="text-xs text-ink/45">{day ? `${day.reviews} reviews · ${day.serviceDays} service days · ${day.positivePercent}% positive` : "Not enough ratings"}</p></div>
                  <p className="shrink-0 font-black text-moss">{score(day?.averageRating)} <span className="text-xs font-medium text-ink/40">/ 5</span></p>
                </div>;
              })}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-ink/8 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Highest-rated service dates</h2>
            <div className="mt-4 space-y-3">
              {rankings.bestDates.length ? rankings.bestDates.slice(0, 10).map((day, index) => (
                <div key={day.serviceDate} className="flex items-center justify-between gap-3 border-b border-ink/8 pb-3 last:border-b-0 last:pb-0">
                  <div><p className="font-bold">#{index + 1} · {dateLabel(day.serviceDate)}</p><p className="text-xs text-ink/45">{day.reviews} reviews · {day.positivePercent}% positive</p></div>
                  <span className="font-black text-moss">{score(day.averageRating)}</span>
                </div>
              )) : <p className="text-sm text-ink/50">No qualifying service dates yet.</p>}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[1.75rem] border border-ink/8 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">By meal</h2>
          <div className="mt-4 space-y-3">
            {rankings.meals.length ? rankings.meals.map((meal) => <div key={meal.name} className="flex items-center justify-between rounded-2xl bg-cream/60 px-4 py-3"><div><p className="font-bold">{meal.name}</p><p className="text-xs text-ink/45">{meal.reviews} reviews · {meal.positivePercent}% positive</p></div><span className="font-black text-moss">{score(meal.averageRating)}</span></div>) : <p className="text-sm text-ink/50">No meal ratings yet.</p>}
          </div>
        </section>
        <section className="rounded-[1.75rem] border border-ink/8 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">By food category</h2>
          <div className="mt-4 space-y-3">
            {rankings.categories.length ? rankings.categories.map((category) => <div key={category.category} className="flex items-center justify-between rounded-2xl bg-cream/60 px-4 py-3"><div><p className="font-bold">{categoryNames[category.category] || category.category}</p><p className="text-xs text-ink/45">{category.votes} votes · {category.foods} foods · {category.positivePercent}% positive</p></div><span className="font-black text-moss">{score(category.averageRating)}</span></div>) : <p className="text-sm text-ink/50">No category ratings yet.</p>}
          </div>
        </section>
      </div>

      {detailed ? <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[1.75rem] border border-ink/8 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Overall star distribution</h2><p className="mt-1 text-sm text-ink/50">{rankings.summary.commentCount ?? 0} written comments in this period</p><div className="mt-5"><StarBars distribution={rankings.summary.distribution} /></div></section>
        <section className="rounded-[1.75rem] border border-ink/8 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold">Recent service-day trend</h2><div className="mt-4 max-h-64 space-y-2 overflow-y-auto">{rankings.dailyTrend.length ? [...rankings.dailyTrend].reverse().map((day) => <div key={day.serviceDate} className="flex justify-between gap-3 border-b border-ink/8 py-2 text-sm"><span>{dateLabel(day.serviceDate)} <span className="text-ink/45">· {day.reviews} reviews</span></span><strong className="text-moss">{score(day.averageRating)}</strong></div>) : <p className="text-sm text-ink/50">No service-day trend yet.</p>}</div></section>
        <section className="rounded-[1.75rem] border border-ink/8 bg-white p-6 shadow-sm lg:col-span-2"><h2 className="text-lg font-bold">Feedback themes</h2><p className="mt-1 text-sm text-ink/50">Tags selected by students; one review may have several tags.</p><div className="mt-4 flex flex-wrap gap-2">{rankings.tags.length ? rankings.tags.map((tag) => <span key={tag.name} className={`rounded-full px-3 py-2 text-xs font-bold ${tag.sentiment === "negative" ? "bg-red-50 text-red-700" : tag.sentiment === "positive" ? "bg-green-50 text-green-700" : "bg-cream text-ink/65"}`}>{tag.name} · {tag.uses}</span>) : <p className="text-sm text-ink/50">No feedback tags yet.</p>}</div></section>
      </div> : null}

      <p className="mt-8 text-xs leading-5 text-ink/45">Only published reviews are counted. Food ranks use individual item ratings; day and meal ranks use overall meal ratings. {detailed ? "All published groups are visible to authorized staff." : "Groups with fewer than 3 ratings are hidden to protect student privacy."} Updated as feedback is published · Through {dateLabel(rankings.asOfDate)}.</p>
    </div>
  );
}
