"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);

    try {
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: String(data.get("email") || "").trim(),
        password: String(data.get("password") || ""),
      });
      if (loginError) throw loginError;

      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const destination = requestedPath?.startsWith("/admin") ? requestedPath : "/admin";
      router.push(destination);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="text-sm font-semibold text-tomato">Kingsway College administration</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
        Sign in to MealUp.
      </h1>
      <p className="mt-3 leading-7 text-ink/55">
        This private workspace is only for authorized Kingsway College cafeteria staff.
      </p>

      <label className="mt-7 block text-sm font-bold">
        Email address
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@kingsway.college"
          className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-normal outline-none focus:border-moss"
        />
      </label>
      <label className="mt-4 block text-sm font-bold">
        Password
        <input
          required
          minLength={8}
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="At least 8 characters"
          className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-normal outline-none focus:border-moss"
        />
      </label>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 font-bold text-white transition hover:bg-moss disabled:opacity-50"
      >
        {loading ? <LoaderCircle size={18} className="animate-spin" /> : null}
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="mt-6 text-center text-sm leading-6 text-ink/50">
        Accounts are managed directly by the Kingsway College MealUp administrator.
      </p>
    </form>
  );
}
