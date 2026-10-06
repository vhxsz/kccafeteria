"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, Clock3, List, Star, Trophy } from "lucide-react";
import type { StudentMenuDay, StudentWeekMenu } from "@/lib/cafeteria/types";

function formatDay(date: string, format: "short" | "long") {
  const dateOnly = date.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", {
    weekday: format === "short" ? "short" : "long",
    month: "short",
    day: "numeric",
  }).format(new Date(dateOnly + "T12:00:00"));
}

function DayMenu({ day }: { day: StudentMenuDay }) {
  return (
    <section className="rounded-[2rem] border border-ink/8 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-tomato">Daily menu</p>
          <h2 className="mt-1 text-2xl font-bold">{formatDay(day.serviceDate, "long")}</h2>
        </div>
        <span className="rounded-full bg-sage/25 px-3 py-1.5 text-xs font-bold text-moss">
          {day.meals.length} meals
        </span>
      </div>

      {day.meals.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-cream/50 p-8 text-center text-sm text-ink/50">
          No menu has been published for this day yet.
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {day.meals.map((meal) => (
            <div key={meal.id}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">{meal.name}</h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/45">
                  <Clock3 size={14} /> {meal.startsAt}–{meal.endsAt}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {meal.items.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-ink/8 bg-cream/25">
                    <div
                      className="h-32 bg-sage/30 bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.imageUrl})` }}
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold">{item.name}</h4>
                          <p className="mt-0.5 text-xs text-ink/45">{item.category}</p>
                        </div>
                        {item.servingSize ? (
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-ink/50">
                            {item.servingSize}
                          </span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="mt-3 text-sm leading-6 text-ink/60">{item.description}</p>
                      ) : null}
                      {(item.dietaryInformation?.length || item.allergens?.length) ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.dietaryInformation?.map((label) => (
                            <span key={label} className="rounded-full bg-moss/10 px-2.5 py-1 text-[11px] font-bold text-moss">
                              {label}
                            </span>
                          ))}
                          {item.allergens?.map((allergen) => (
                            <span key={allergen} className="rounded-full bg-tomato/10 px-2.5 py-1 text-[11px] font-bold text-tomato">
                              Contains {allergen}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StudentMenu({ menu }: { menu: StudentWeekMenu }) {
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: menu.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const todayPart = (type: Intl.DateTimeFormatPartTypes) =>
    todayParts.find((part) => part.type === type)?.value || "";
  const today = `${todayPart("year")}-${todayPart("month")}-${todayPart("day")}`;
  const initialDate = menu.days.some((day) => day.serviceDate.slice(0, 10) === today)
    ? today
    : menu.days[0]?.serviceDate.slice(0, 10);
  const [view, setView] = useState<"day" | "week">("week");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const selectedDay = useMemo(
    () => menu.days.find((day) => day.serviceDate.slice(0, 10) === selectedDate) || menu.days[0],
    [menu.days, selectedDate],
  );

  return (
    <main className="min-h-screen bg-cream pb-20 text-ink">
      <header className="border-b border-ink/8 bg-moss text-white">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Back to home">
              <ChevronLeft size={20} />
            </Link>
            <div className="text-center">
              <p className="font-bold">{menu.schoolName}</p>
              <p className="text-xs text-white/60">{menu.cafeteriaName}</p>
            </div>
            <Link href="/rankings" className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Food rankings"><Trophy size={19} /></Link>
          </div>
          <div className="mt-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.16em] text-sun">Student menu</p>
              <h1 className="mt-2 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">What&apos;s cooking this week?</h1>
              <p className="mt-3 max-w-xl text-white/65">Browse breakfast, lunch, and dinner from Monday through Sunday. <Link href="/rankings" className="font-bold text-white underline underline-offset-4">See student favorites</Link>.</p>
            </div>
            <div className="flex rounded-full bg-white/10 p-1">
              <button onClick={() => setView("day")} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${view === "day" ? "bg-white text-ink" : "text-white"}`}><List size={16} /> Day</button>
              <button onClick={() => setView("week")} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${view === "week" ? "bg-white text-ink" : "text-white"}`}><CalendarDays size={16} /> Week</button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
        <div className="grid grid-cols-4 gap-2 overflow-x-auto pb-2 sm:grid-cols-7">
          {menu.days.map((day) => (
            <button
              key={day.serviceDate}
              onClick={() => { setSelectedDate(day.serviceDate.slice(0, 10)); setView("day"); }}
              className={`min-w-24 rounded-2xl border p-3 text-left transition ${selectedDate === day.serviceDate ? "border-moss bg-moss text-white" : "border-ink/8 bg-white hover:border-moss/35"}`}
            >
              <p className="text-xs font-bold uppercase tracking-wider opacity-60">{formatDay(day.serviceDate, "short").split(",")[0]}</p>
              <p className="mt-1 font-bold">{formatDay(day.serviceDate, "short").split(", ")[1]}</p>
              <p className="mt-2 text-[11px] opacity-60">{day.meals.length} meals</p>
            </button>
          ))}
        </div>

        <div className="mt-5">
          {view === "day" && selectedDay ? <DayMenu day={selectedDay} /> : null}
          {view === "week" ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {menu.days.map((day) => <DayMenu key={day.serviceDate} day={day} />)}
            </div>
          ) : null}
        </div>

        <div className="mt-7 flex flex-col items-center justify-between gap-4 rounded-3xl bg-sun/30 p-6 text-center sm:flex-row sm:text-left">
          <div><p className="font-bold">Eating now?</p><p className="mt-1 text-sm text-ink/55">Scan the QR code or NFC tag at your table, then sign in with your school Google account to rate the meal.</p></div>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white"><Star size={16} /> Back to home</Link>
        </div>
      </div>
    </main>
  );
}
