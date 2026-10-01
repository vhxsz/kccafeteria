import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Home,
  MessageSquareText,
  MoreHorizontal,
  Search,
  Settings,
  Star,
  Tags,
  TrendingUp,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { label: "Site home", icon: Home, href: "/", active: false },
  { label: "Overview", icon: LayoutDashboard, href: "/admin", active: true },
  { label: "Weekly planner", icon: CalendarDays, href: "/admin/schedule", active: false },
  { label: "Reviews", icon: MessageSquareText, href: "/admin#reviews", active: false },
  { label: "Food library", icon: ClipboardList, href: "/admin/schedule#library", active: false },
  { label: "Tables & tags", icon: Tags, href: "/admin/tables", active: false },
  { label: "Settings", icon: Settings, href: "/admin/settings", active: false },
];

const recentReviews = [
  {
    rating: 5,
    meal: "Lunch",
    comment: "The chicken was really flavorful today!",
    tags: ["Tasty", "Good temperature"],
    time: "12:42 PM",
  },
  {
    rating: 3,
    meal: "Lunch",
    comment: "Rice was good, but the juice could be colder.",
    tags: ["Too cold"],
    time: "12:31 PM",
  },
  {
    rating: 4,
    meal: "Lunch",
    comment: "Loved the salad. More dressing would be nice.",
    tags: ["Fresh"],
    time: "12:18 PM",
  },
];

const trendData = [56, 63, 58, 72, 69, 82, 78];

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-[#f4f5f0] text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink/8 bg-white p-5 lg:flex lg:flex-col">
        <div className="px-2 py-2">
          <BrandMark />
        </div>
        <nav className="mt-10 space-y-1" aria-label="Admin navigation">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition " +
                (item.active
                  ? "bg-moss text-white"
                  : "text-ink/55 hover:bg-cream hover:text-ink")
              }
            >
              <item.icon size={19} strokeWidth={1.8} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-cream p-4">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-moss">Pilot workspace</p>
          <p className="mt-2 text-sm font-bold">Greenwood School</p>
          <p className="mt-1 text-xs text-ink/45">Main cafeteria</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="border-b border-ink/8 bg-white/80 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-5 sm:px-8 lg:px-10">
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <div className="hidden items-center gap-2 text-sm font-semibold text-ink/55 lg:flex">
              Greenwood School
              <ChevronDown size={15} />
            </div>
            <div className="flex items-center gap-3">
              <button
                className="grid h-10 w-10 place-items-center rounded-full border border-ink/8 bg-white text-ink/55"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
              <button
                className="relative grid h-10 w-10 place-items-center rounded-full border border-ink/8 bg-white text-ink/55"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-tomato" />
              </button>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-sun text-sm font-bold">AK</div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] p-5 sm:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-tomato">Thursday, October 1</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                Good afternoon, Alex.
              </h1>
              <p className="mt-2 text-ink/50">Here&apos;s how your cafeteria is doing today.</p>
            </div>
            <Link
              href="/site/rate/tag14"
              className="inline-flex items-center justify-center rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-bold shadow-sm"
            >
              Preview student view
            </Link>
          </div>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Today's reviews", value: "342", change: "+18%", tone: "bg-moss text-white" },
              { label: "Average rating", value: "4.2", change: "+0.3", tone: "bg-white" },
              { label: "Student satisfaction", value: "84%", change: "+6%", tone: "bg-white" },
              { label: "Response rate", value: "31%", change: "+4%", tone: "bg-white" },
            ].map((metric, index) => (
              <article
                key={metric.label}
                className={"rounded-3xl border border-ink/8 p-5 shadow-sm " + metric.tone}
              >
                <div className="flex items-start justify-between">
                  <p className={"text-sm font-medium " + (index === 0 ? "text-white/60" : "text-ink/50")}>
                    {metric.label}
                  </p>
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-xs font-bold " +
                      (index === 0 ? "bg-white/12 text-sun" : "bg-sage/35 text-moss")
                    }
                  >
                    {metric.change}
                  </span>
                </div>
                <p className="mt-6 text-4xl font-bold tracking-[-0.05em]">{metric.value}</p>
                <p className={"mt-2 text-xs " + (index === 0 ? "text-white/45" : "text-ink/35")}>
                  compared with last Thursday
                </p>
              </article>
            ))}
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <article className="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-ink/45">Average rating</p>
                  <h2 className="mt-1 text-xl font-bold">This week&apos;s trend</h2>
                </div>
                <button className="rounded-full border border-ink/8 px-3 py-1.5 text-xs font-bold text-ink/55">
                  Last 7 days
                </button>
              </div>
              <div className="mt-8 flex h-52 items-end gap-3 sm:gap-5">
                {trendData.map((height, index) => (
                  <div key={index} className="flex h-full flex-1 flex-col justify-end gap-3 text-center">
                    <div
                      className={
                        "w-full rounded-t-xl transition hover:opacity-80 " +
                        (index === trendData.length - 1 ? "bg-tomato" : "bg-sage")
                      }
                      style={{ height: height + "%" }}
                    />
                    <span className="text-xs font-medium text-ink/35">
                      {["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"][index]}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink/45">Today&apos;s meals</p>
                  <h2 className="mt-1 text-xl font-bold">Meal comparison</h2>
                </div>
                <TrendingUp size={21} className="text-moss" />
              </div>
              <div className="mt-7 space-y-6">
                {[
                  { label: "Breakfast", score: "4.5", width: "90%" },
                  { label: "Lunch", score: "4.2", width: "84%" },
                  { label: "Dinner", score: "—", width: "0%" },
                ].map((meal) => (
                  <div key={meal.label}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-semibold">{meal.label}</span>
                      <span className="font-bold">{meal.score}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-cream">
                      <div className="h-full rounded-full bg-moss" style={{ width: meal.width }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-2 rounded-2xl bg-sun/20 p-4 text-sm">
                <Star size={17} className="fill-sun text-sun" />
                Breakfast is your highest-rated meal today.
              </div>
            </article>
          </section>

          <section id="reviews" className="mt-4 rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink/45">Live feedback</p>
                <h2 className="mt-1 text-xl font-bold">Recent reviews</h2>
              </div>
              <button className="text-sm font-bold text-moss">View all</button>
            </div>
            <div className="mt-5 divide-y divide-ink/8">
              {recentReviews.map((review) => (
                <article
                  key={review.time}
                  className="grid gap-4 py-5 md:grid-cols-[90px_1fr_auto] md:items-center"
                >
                  <div>
                    <div className="flex items-center gap-1 font-bold">
                      <Star size={16} className="fill-sun text-sun" />
                      {review.rating}.0
                    </div>
                    <p className="mt-1 text-xs text-ink/40">{review.meal}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-6">{review.comment}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {review.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-sage/30 px-2.5 py-1 text-xs font-semibold text-moss"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="text-xs text-ink/35">{review.time}</span>
                    <MoreHorizontal size={18} className="text-ink/35" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
