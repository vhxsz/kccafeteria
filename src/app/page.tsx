import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  MessageSquareText,
  QrCode,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const features = [
  {
    icon: QrCode,
    title: "Tap. Taste. Tell us.",
    description:
      "Students open the right menu instantly from an NFC tag or QR code at their table.",
  },
  {
    icon: MessageSquareText,
    title: "Feedback with context",
    description:
      "Every rating is connected to the meal, food item, time, and cafeteria location.",
  },
  {
    icon: BarChart3,
    title: "Decisions, not noise",
    description:
      "Managers see trends, recurring issues, and clear signals they can act on.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream text-ink">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <BrandMark />
        <Link
          href="/login"
          className="rounded-full border border-ink/15 bg-white/70 px-5 py-2.5 text-sm font-semibold transition hover:border-ink/30 hover:bg-white"
        >
          Manager sign in
        </Link>
      </nav>

      <section className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 pb-24 pt-12 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-12 lg:pb-32 lg:pt-20">
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-moss/15 bg-moss/8 px-4 py-2 text-sm font-semibold text-moss">
            <Sparkles size={15} aria-hidden="true" />
            Better meals start with better listening
          </div>
          <h1 className="max-w-3xl text-balance text-5xl font-bold leading-[.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Make every school meal{" "}
            <span className="font-serif font-normal italic text-tomato">better.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-ink/65 sm:text-xl">
            A simple feedback loop that helps students feel heard and gives
            cafeteria teams the clarity to improve every plate.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/site/rate/tag14"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-moss"
            >
              Try the student experience
              <ArrowRight
                size={17}
                className="transition group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-6 py-3.5 text-sm font-bold transition hover:border-ink/30"
            >
              Explore the dashboard
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-ink/55">
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-moss" /> Privacy-first
            </span>
            <span className="flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-moss" /> Built for schools
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:mx-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sun/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-sage/40 blur-3xl" />
          <div className="relative rotate-1 rounded-[2.25rem] border border-ink/10 bg-white p-4 shadow-[0_30px_90px_rgba(38,49,41,.16)] sm:p-6">
            <div className="rounded-[1.75rem] bg-moss p-6 text-white sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/65">Thursday, October 1</p>
                  <h2 className="mt-1 text-3xl font-bold tracking-tight">Today&apos;s lunch</h2>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12">
                  <UtensilsCrossed size={22} />
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {["Grilled chicken", "Herbed rice", "Garden salad", "Orange juice"].map(
                  (item, index) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
                    >
                      <span className="text-xs font-bold uppercase tracking-[.16em] text-sun">
                        {index === 0 ? "Main" : index === 3 ? "Drink" : "Side"}
                      </span>
                      <p className="mt-2 font-semibold">{item}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="flex items-center justify-between px-3 pb-2 pt-5">
              <div>
                <p className="text-sm text-ink/50">How was your meal?</p>
                <div className="mt-1 flex gap-1 text-2xl text-tomato" aria-label="Five stars">
                  ★ ★ ★ ★ ★
                </div>
              </div>
              <div className="rounded-full bg-sun px-4 py-2 text-sm font-bold">Share feedback</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-ink/8 bg-white/55">
        <div className="mx-auto grid w-full max-w-7xl gap-px px-5 py-6 sm:px-8 md:grid-cols-3 lg:px-12">
          {features.map((feature) => (
            <article key={feature.title} className="px-3 py-8 md:px-8">
              <feature.icon className="text-tomato" size={28} strokeWidth={1.8} />
              <h2 className="mt-5 text-xl font-bold tracking-tight">{feature.title}</h2>
              <p className="mt-2 max-w-sm leading-7 text-ink/60">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
