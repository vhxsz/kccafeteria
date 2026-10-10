import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Medal,
  QrCode,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const actions = [
  { href: "/menu", eyebrow: "This week", title: "See the menu", description: "Today’s meals, serving times, ingredients, and allergens.", icon: CalendarDays, className: "bg-moss text-white", iconClassName: "bg-white/15 text-white", copyClassName: "text-white/70", arrowClassName: "bg-white text-moss" },
  { href: "/rankings", eyebrow: "Student picks", title: "Explore rankings", description: "Discover the meals and days students rate highest.", icon: Medal, className: "bg-sun text-ink", iconClassName: "bg-white text-tomato", copyClassName: "text-ink/60", arrowClassName: "bg-white text-moss" },
  { href: "#how-to-vote", eyebrow: "Have your say", title: "Rate a meal", description: "Use the QR or NFC tag at your table after your meal.", icon: Star, className: "bg-white text-ink ring-1 ring-ink/8", iconClassName: "bg-sage/35 text-moss", copyClassName: "text-ink/60", arrowClassName: "bg-moss text-white" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf8f9] text-ink">
      <header className="border-b border-ink/8 bg-white/85 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <BrandMark />
          <div className="flex items-center gap-1 sm:gap-4">
            <Link href="/rankings" className="rounded-full px-3 py-2 text-sm font-bold text-ink/60 transition hover:bg-sun hover:text-moss sm:px-4">Rankings</Link>
            <Link href="/menu" className="rounded-full bg-moss px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(133,0,29,.16)] transition hover:bg-tomato">Menu</Link>
          </div>
        </nav>
      </header>

      <div className="mx-auto w-full max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12">
        <section className="relative overflow-hidden rounded-[2rem] bg-moss px-6 py-9 text-white shadow-[0_20px_55px_rgba(72,0,17,.20)] sm:rounded-[2.5rem] sm:px-10 sm:py-12">
          <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/8" />
          <div className="absolute bottom-[-5rem] right-16 h-44 w-44 rounded-full border-[22px] border-white/8" />
          <div className="relative max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[.13em] text-white/80"><UtensilsCrossed size={14} /> Kingsway College cafeteria</p>
            <h1 className="mt-5 text-4xl font-bold tracking-[-0.055em] sm:text-5xl">Food decisions, made easy.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/75 sm:text-lg">Check what&apos;s being served, share a quick review, and see what the Kingsway community is enjoying.</p>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="start-here">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-tomato">Start here</p><h2 id="start-here" className="mt-1 text-2xl font-bold tracking-[-0.035em]">What would you like to do?</h2></div><span className="hidden text-sm text-ink/45 sm:block">MealUp for students</span></div>
          <div className="grid gap-4 md:grid-cols-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return <Link key={action.title} href={action.href} className={`group flex min-h-60 flex-col rounded-[1.75rem] p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${action.className}`}>
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${action.iconClassName}`}><Icon size={21} /></span>
                <p className={`mt-6 text-xs font-bold uppercase tracking-[.14em] ${action.copyClassName}`}>{action.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-bold tracking-[-0.035em]">{action.title}</h3>
                <p className={`mt-2 max-w-xs text-sm leading-6 ${action.copyClassName}`}>{action.description}</p>
                <span className={`mt-auto flex h-9 w-9 items-center justify-center rounded-full transition group-hover:translate-x-1 ${action.arrowClassName}`}><ArrowRight size={17} /></span>
              </Link>;
            })}
          </div>
        </section>

        <section id="how-to-vote" className="mt-6 rounded-[2rem] border border-ink/8 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-7 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sun text-moss"><QrCode size={27} /></div>
            <div><p className="text-sm font-bold text-tomato">Voting at the cafeteria</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.035em]">Rate only what you ate.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">Scan your table&apos;s QR code or tap its NFC tag. Sign in with your Kingsway Google account, select your meal items, and leave one review per meal.</p></div>
            <Link href="/site/rate/tag14" className="inline-flex w-fit items-center gap-2 rounded-full bg-moss px-5 py-3 text-sm font-bold text-white transition hover:bg-tomato">Open voting <ChevronRight size={17} /></Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/rankings" className="group rounded-[1.75rem] bg-sun p-6 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-tomato">Community feedback</p><h2 className="mt-1 text-xl font-bold tracking-[-0.03em]">What&apos;s popular right now?</h2></div><Medal className="text-tomato" /></div><p className="mt-3 text-sm leading-6 text-ink/60">See top-rated meals, most-voted dishes, and the best days of the week.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-moss">View rankings <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span></Link>
          <Link href="/menu" className="group rounded-[1.75rem] border border-ink/8 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-tomato">Plan ahead</p><h2 className="mt-1 text-xl font-bold tracking-[-0.03em]">Browse the full week</h2></div><CalendarDays className="text-moss" /></div><p className="mt-3 text-sm leading-6 text-ink/60">Every meal from Monday to Sunday, with serving times and dietary details.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-moss">Open weekly menu <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span></Link>
        </section>

        <footer className="mt-10 flex flex-col gap-4 border-t border-ink/8 pt-7 text-sm text-ink/45 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2"><CircleHelp size={16} /> Ask cafeteria staff if you need help finding your table tag.</p><Link href="/login" className="w-fit text-xs font-semibold text-ink/40 underline decoration-ink/20 underline-offset-4 transition hover:text-moss">Staff? Sign in</Link></footer>
      </div>
    </main>
  );
}
