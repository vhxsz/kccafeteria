import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  QrCode,
  Star,
  Trophy,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const menuDetails = [
  "Breakfast, lunch, and dinner",
  "Monday through Sunday",
  "Ingredients and allergen details",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="border-b border-ink/10 bg-white">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <BrandMark />
          <div className="hidden items-center gap-7 text-sm font-semibold text-ink/65 md:flex">
            <a href="#menu" className="transition hover:text-moss">
              Menu
            </a>
            <a href="#vote" className="transition hover:text-moss">
              Vote
            </a>
            <Link href="/rankings" className="transition hover:text-moss">Rankings</Link>
          </div>
        </nav>
      </header>

      <section id="menu" className="border-b border-ink/10 bg-[#f8f4f5]">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-28">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.16em] text-moss">
              Kingsway College · Main cafeteria
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              See what&apos;s on the menu.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/65">
              Check the full seven-day cafeteria schedule, including serving times,
              ingredients, allergens, and dietary information.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-moss px-7 py-4 text-sm font-bold text-white shadow-[0_10px_30px_rgba(133,0,29,.18)] transition hover:-translate-y-0.5 hover:bg-tomato"
              >
                View this week&apos;s menu <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a
                href="#vote"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-7 py-4 text-sm font-bold shadow-sm transition hover:border-moss hover:text-moss"
              >
                Rate a meal <Star size={17} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2.25rem] border border-ink/10 bg-white/95 shadow-[0_24px_70px_rgba(36,9,16,.10)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-moss">
                  Student menu
                </p>
                <p className="mt-1 text-xl font-bold">Current week</p>
              </div>
              <CalendarDays size={26} className="text-moss" aria-hidden="true" />
            </div>
            <div className="px-6 py-7 sm:px-8">
              <ul className="space-y-4">
                {menuDetails.map((detail) => (
                  <li key={detail} className="flex items-center gap-3 text-sm font-semibold">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sun text-moss">
                      <Check size={14} strokeWidth={3} aria-hidden="true" />
                    </span>
                    {detail}
                  </li>
                ))}
              </ul>
              <div className="mt-7 border-t border-ink/10 pt-6">
                <Link
                  href="/menu"
                  className="flex items-center justify-between gap-4 font-bold text-moss hover:text-tomato"
                >
                  Open the weekly schedule
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sun/50 text-moss"><Trophy size={24} /></span>
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-moss">Community favorites</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Which foods do students love?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Explore the most-voted dishes, highest ratings, and best days of the week. Results are grouped to protect student privacy.</p></div>
          </div>
          <Link href="/rankings" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-moss px-6 py-3.5 text-sm font-bold text-white transition hover:bg-tomato">Explore rankings <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section id="vote" className="bg-moss text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/25 bg-white/5">
              <QrCode size={24} aria-hidden="true" />
            </div>
            <p className="mt-7 text-sm font-bold uppercase tracking-[.16em] text-white/65">
              Student feedback
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              Had a meal today?
            </h2>
          </div>

          <div>
            <p className="max-w-2xl text-lg leading-8 text-white/75">
              Scan the QR code or tap the NFC tag on your table, then sign in
              with your @kingsway.college Google account. Choose what you ate,
              rate each item, and share one review per meal.
            </p>
            <ol className="mt-8 grid overflow-hidden rounded-[1.75rem] border border-white/20 bg-white/20 sm:grid-cols-3">
              {[
                ["01", "Open your table tag"],
                ["02", "Sign in with school Google"],
                ["03", "Rate what you ate"],
              ].map(([number, label]) => (
                <li key={number} className="border-b border-white/15 bg-moss p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                  <span className="text-xs font-bold tracking-[.16em] text-white/50">{number}</span>
                  <p className="mt-2 font-bold">{label}</p>
                </li>
              ))}
            </ol>
            <Link
              href="/site/rate/tag14"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-moss shadow-[0_12px_35px_rgba(36,9,16,.16)] transition hover:-translate-y-0.5 hover:bg-sun"
            >
              Preview student voting <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-ink/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-semibold text-ink/70">MealUp at Kingsway College</p>
          <div className="flex flex-col gap-3 sm:items-end">
            <p className="inline-flex items-center gap-2">
              <Clock3 size={15} aria-hidden="true" /> Menu information is maintained by cafeteria staff.
            </p>
            <Link
              href="/login"
              className="w-fit text-xs text-ink/35 underline decoration-ink/20 underline-offset-4 transition hover:text-moss"
            >
              Staff? Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
