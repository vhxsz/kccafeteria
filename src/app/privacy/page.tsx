import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = { title: "Privacy" };

const sections = [
  {
    title: "What we collect",
    items: [
      "Your Kingsway College Google account: name and school email address.",
      "The meal feedback you submit: star ratings, feedback tags, and an optional comment.",
      "The table tag you used and the time you submitted, so feedback is linked to the right meal.",
    ],
  },
  {
    title: "Why we collect it",
    items: [
      "Your school account confirms you are a Kingsway student and allows one review per person for each meal.",
      "Feedback helps the cafeteria team plan menus and improve the food.",
    ],
  },
  {
    title: "Who can see it",
    items: [
      "Public pages show only totals and averages. Groups with fewer than 3 ratings are hidden.",
      "Authorized cafeteria staff can see which accounts have voted and when.",
      "Staff review reports show ratings and comments without your name.",
      "Your data is not sold and is not used for advertising.",
    ],
  },
  {
    title: "Your choices",
    items: [
      "Voting is optional. You can view the menu and rankings without signing in.",
      "Leave the comment field empty if you prefer not to write anything.",
      "To ask what data is held about you, or to have it removed, contact the Kingsway College cafeteria administration.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#faf8f9] text-ink">
      <header className="border-b border-ink/8 bg-white/85">
        <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <BrandMark />
          <Link href="/" className="text-sm font-bold text-moss hover:underline">Home</Link>
        </nav>
      </header>
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-sm font-bold text-tomato">MealUp at Kingsway College</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">How your feedback is handled</h1>
        <p className="mt-4 leading-7 text-ink/60">
          A plain-language summary of the information MealUp uses when you rate a cafeteria meal.
        </p>
        <div className="mt-8 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-ink/8 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">{section.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-ink/65">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
