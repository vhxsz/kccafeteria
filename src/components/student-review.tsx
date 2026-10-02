"use client";

import { useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  Info,
  Leaf,
  LoaderCircle,
  Send,
  Star,
} from "lucide-react";
import Link from "next/link";
import type { TableExperience } from "@/lib/cafeteria/types";

const feedbackTags = [
  "Tasty",
  "Fresh",
  "Good temperature",
  "Good portion",
  "Too cold",
  "Too salty",
  "Small portion",
  "Needs more variety",
];

function StarRating({
  value,
  onChange,
  compact = false,
  label,
}: {
  value: number;
  onChange: (rating: number) => void;
  compact?: boolean;
  label: string;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={star + (star === 1 ? " star" : " stars")}
          onClick={() => onChange(star)}
          className={
            "grid place-items-center rounded-xl transition hover:bg-tomato/8 active:scale-95 " +
            (compact ? "h-8 w-8" : "h-12 w-12")
          }
        >
          <Star
            size={compact ? 21 : 33}
            strokeWidth={1.8}
            className={star <= value ? "fill-tomato text-tomato" : "text-ink/20"}
          />
        </button>
      ))}
    </div>
  );
}

export function StudentReview({ experience }: { experience: TableExperience }) {
  const [rating, setRating] = useState(0);
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(experience.serviceDate + "T12:00:00"));

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  async function submitFeedback() {
    if (!experience.meal || !experience.menuId || rating === 0) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagCode: experience.tagCode,
          menuId: experience.menuId,
          overallRating: rating,
          itemRatings: Object.entries(itemRatings).map(([foodItemId, itemRating]) => ({
            foodItemId,
            rating: itemRating,
          })),
          tags: selectedTags,
          comment,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "We could not send your feedback.");
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not send your feedback. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!experience.meal) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream px-5 py-12 text-ink">
        <section className="w-full max-w-md rounded-[2rem] border border-ink/8 bg-white p-8 text-center shadow-[0_24px_70px_rgba(38,49,41,.12)]">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sun/35 text-moss">
            <Clock3 size={36} />
          </div>
          <p className="mt-7 text-sm font-bold uppercase tracking-[.18em] text-tomato">
            {experience.cafeteriaName}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">
            No meal is being served right now.
          </h1>
          <p className="mx-auto mt-4 max-w-sm leading-7 text-ink/60">
            Come back during the next scheduled meal to see the menu and share feedback.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3.5 font-bold text-white transition hover:bg-moss"
          >
            Visit the school cafeteria home
          </Link>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream px-5 py-12 text-ink">
        <section className="w-full max-w-md rounded-[2rem] border border-ink/8 bg-white p-8 text-center shadow-[0_24px_70px_rgba(38,49,41,.12)]">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-moss text-white">
            <Check size={38} strokeWidth={2.5} />
          </div>
          <p className="mt-7 text-sm font-bold uppercase tracking-[.18em] text-tomato">
            Feedback received
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.045em]">
            Thanks for helping us improve.
          </h1>
          <p className="mx-auto mt-4 max-w-sm leading-7 text-ink/60">
            Your meal and individual item ratings are private and ready for the
            cafeteria team.
          </p>
          <button
            type="button"
            onClick={() => {
              setRating(0);
              setItemRatings({});
              setSelectedTags([]);
              setComment("");
              setSubmitted(false);
            }}
            className="mt-8 w-full rounded-full bg-ink px-6 py-3.5 font-bold text-white transition hover:bg-moss"
          >
            Back to today&apos;s menu
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-32 text-ink">
      <header className="sticky top-0 z-20 border-b border-ink/8 bg-cream/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-white"
            aria-label="Back to home"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold">{experience.schoolName}</p>
            <p className="text-xs text-ink/50">
              {experience.cafeteriaName} · Table {experience.tableNumber}
            </p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-tomato text-white">
            <Leaf size={19} fill="currentColor" strokeWidth={1.5} />
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link
          href={`/site/menu/${experience.tagCode}`}
          className="mb-5 flex items-center justify-between rounded-2xl border border-ink/8 bg-white px-5 py-4 font-bold shadow-sm transition hover:border-moss/35"
        >
          <span className="inline-flex items-center gap-2"><CalendarDays size={19} className="text-moss" /> View the 7-day menu</span>
          <span className="text-sm text-ink/40">Day &amp; week views</span>
        </Link>
        <section className="rounded-[2rem] bg-moss p-6 text-white sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-sun">
                <span className="h-2 w-2 rounded-full bg-sun" />
                Serving now
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-[-0.045em]">
                {experience.meal.name}
              </h1>
              <p className="mt-2 text-sm text-white/65">
                {experience.meal.startsAt} – {experience.meal.endsAt} · {formattedDate}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Table</p>
              <p className="mt-1 text-xl font-bold">{experience.tableNumber}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {experience.items.map((item) => (
              <article key={item.id} className="rounded-2xl bg-white p-3 text-ink">
                <div
                  className="mb-3 h-24 rounded-xl bg-sage/40 bg-cover bg-center"
                  style={{ backgroundImage: "url(" + item.imageUrl + ")" }}
                  role="img"
                  aria-label={item.name}
                />
                <p className="font-bold leading-tight">{item.name}</p>
                <p className="mt-1 text-xs text-ink/45">{item.category}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-ink/8 bg-white p-6 sm:p-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-ink/45">One quick question</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">How was your meal?</h2>
          </div>
          <div className="mx-auto mt-5 max-w-sm">
            <div className="flex justify-center">
              <StarRating value={rating} onChange={setRating} label="Overall meal rating" />
            </div>
            <div className="mt-1 flex justify-between px-2 text-xs text-ink/40">
              <span>Not great</span>
              <span>Loved it</span>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-ink/8 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight">Rate individual items</h2>
          <p className="mt-1 text-sm text-ink/50">
            Optional · Rate only the dishes you tried.
          </p>
          <div className="mt-5 divide-y divide-ink/8">
            {experience.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 shrink-0 rounded-xl bg-sage/40 bg-cover bg-center"
                    style={{ backgroundImage: "url(" + item.imageUrl + ")" }}
                  />
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-ink/40">{item.category}</p>
                  </div>
                </div>
                <StarRating
                  compact
                  value={itemRatings[item.id] || 0}
                  onChange={(itemRating) =>
                    setItemRatings((current) => ({ ...current, [item.id]: itemRating }))
                  }
                  label={"Rating for " + item.name}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-ink/8 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight">What stood out?</h2>
          <p className="mt-1 text-sm text-ink/50">Choose as many as you like.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {feedbackTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                  className={
                    "rounded-full border px-4 py-2.5 text-sm font-semibold transition " +
                    (active
                      ? "border-moss bg-moss text-white"
                      : "border-ink/10 bg-cream/50 text-ink/70 hover:border-moss/30")
                  }
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <label htmlFor="comment" className="mt-7 block text-sm font-bold">
            Anything else? <span className="font-normal text-ink/40">Optional</span>
          </label>
          <textarea
            id="comment"
            value={comment}
            maxLength={280}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Tell the cafeteria team what would make this meal better..."
            className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-ink/10 bg-cream/40 p-4 text-sm leading-6 placeholder:text-ink/35"
          />
          <p className="mt-2 text-right text-xs text-ink/35">{comment.length}/280</p>
        </section>

        {error && (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-start gap-2 px-3 text-xs leading-5 text-ink/45">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            Your name is never shown publicly. Tag reference:{" "}
            <span className="font-mono">{experience.tagCode}</span>
          </p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/8 bg-white/92 p-4 backdrop-blur-xl">
        <button
          type="button"
          disabled={rating === 0 || submitting}
          onClick={submitFeedback}
          className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 font-bold text-white transition enabled:hover:bg-moss disabled:cursor-not-allowed disabled:opacity-35"
        >
          {submitting ? (
            <>
              <LoaderCircle size={18} className="animate-spin" /> Sending...
            </>
          ) : (
            <>
              Send feedback <Send size={17} />
            </>
          )}
        </button>
      </div>
    </main>
  );
}
