"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f6f7] p-6 text-ink">
      <section className="w-full max-w-lg rounded-[2rem] border border-ink/8 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-700">
          <AlertTriangle size={25} />
        </span>
        <h1 className="mt-5 text-2xl font-bold">MealUp could not load this page</h1>
        <p className="mt-2 text-sm leading-6 text-ink/50">
          Your data was not replaced with sample content. Try the request again, or return to the home page.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white">
            <RotateCcw size={16} /> Try again
          </button>
          <Link href="/" className="rounded-full border border-ink/10 px-5 py-3 text-sm font-bold">Go home</Link>
        </div>
      </section>
    </main>
  );
}
