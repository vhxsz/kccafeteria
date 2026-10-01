import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-cream text-ink lg:grid-cols-[.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-moss p-12 text-white lg:flex lg:flex-col">
        <BrandMark />
        <div className="my-auto max-w-lg">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-sun">
            A clearer cafeteria
          </p>
          <h2 className="mt-5 text-6xl font-bold leading-[.98] tracking-[-0.055em]">
            Better food starts with listening.
          </h2>
          <p className="mt-6 text-lg leading-8 text-white/65">
            Schedule meals, hear from students, and turn every review into a
            practical improvement.
          </p>
        </div>
        <p className="text-sm text-white/40">Privacy-first feedback for schools.</p>
      </section>
      <section className="flex flex-col px-5 py-7 sm:px-10 lg:px-16">
        <div className="lg:hidden">
          <BrandMark />
        </div>
        <div className="mx-auto my-auto w-full max-w-xl rounded-[2rem] border border-ink/8 bg-white p-6 shadow-[0_24px_80px_rgba(38,49,41,.1)] sm:p-10">
          {children}
        </div>
      </section>
    </main>
  );
}
