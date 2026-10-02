"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);

    try {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ) {
        setComplete(true);
        return;
      }

      const supabase = createClient();
      const email = String(data.get("email") || "").trim();
      const password = String(data.get("password") || "");

      if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
        router.push("/admin");
        router.refresh();
        return;
      }

      const schoolName = String(data.get("schoolName") || "").trim();
      const cafeteriaName = String(data.get("cafeteriaName") || "").trim();
      const displayName = String(data.get("displayName") || "").trim();
      const schoolSlug = schoolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/admin",
          data: {
            account_type: "school_admin",
            display_name: displayName,
            school_name: schoolName,
            school_slug: schoolSlug,
            cafeteria_name: cafeteriaName,
            timezone: String(data.get("timezone") || "America/Toronto"),
          },
        },
      });
      if (signUpError) throw signUpError;

      if (signUpData.session) {
        router.push("/admin");
        router.refresh();
      } else {
        setComplete(true);
      }
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

  if (complete) {
    return (
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-moss text-white">
          <Check size={30} />
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em]">
          {process.env.NEXT_PUBLIC_SUPABASE_URL
            ? "Check your email"
            : "Prototype account ready"}
        </h1>
        <p className="mt-3 leading-7 text-ink/55">
          {process.env.NEXT_PUBLIC_SUPABASE_URL
            ? "Use the confirmation link we sent you to finish creating your school workspace."
            : "Supabase credentials are not connected yet, so this form is running in preview mode."}
        </p>
        <Link
          href="/admin"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 font-bold text-white"
        >
          Open dashboard <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="text-sm font-semibold text-tomato">
        {mode === "signup" ? "Create your school workspace" : "Welcome back"}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
        {mode === "signup" ? "Start improving every meal." : "Sign in to TrayVoice."}
      </h1>
      <p className="mt-3 leading-7 text-ink/55">
        {mode === "signup"
          ? "Set up the school, cafeteria, and administrator account in one step."
          : "Use your cafeteria manager or school administrator account."}
      </p>

      {mode === "signup" && (
        <>
          <label className="mt-7 block text-sm font-bold">
            Your name
            <input
              required
              name="displayName"
              autoComplete="name"
              placeholder="Alex Kim"
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-normal outline-none focus:border-moss"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="mt-4 block text-sm font-bold">
              School name
              <input
                required
                name="schoolName"
                placeholder="Greenwood School"
                className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-normal outline-none focus:border-moss"
              />
            </label>
            <label className="mt-4 block text-sm font-bold">
              Cafeteria name
              <input
                required
                name="cafeteriaName"
                placeholder="Main cafeteria"
                className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-normal outline-none focus:border-moss"
              />
            </label>
          </div>
          <label className="mt-4 block text-sm font-bold">
            School timezone
            <select
              name="timezone"
              defaultValue="America/Toronto"
              className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-normal outline-none focus:border-moss"
            >
              <option value="America/Toronto">Eastern Time — Toronto</option>
              <option value="America/Chicago">Central Time — Chicago</option>
              <option value="America/Denver">Mountain Time — Denver</option>
              <option value="America/Los_Angeles">Pacific Time — Los Angeles</option>
              <option value="America/Sao_Paulo">Brasília Time — São Paulo</option>
            </select>
          </label>
        </>
      )}

      <label className={(mode === "signup" ? "mt-4" : "mt-7") + " block text-sm font-bold"}>
        Email address
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@school.edu"
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
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
        {loading ? "Please wait..." : mode === "signup" ? "Create school workspace" : "Sign in"}
      </button>
      <p className="mt-6 text-center text-sm text-ink/50">
        {mode === "signup" ? "Already have an account?" : "New to TrayVoice?"}{" "}
        <Link
          href={mode === "signup" ? "/login" : "/signup"}
          className="font-bold text-moss underline-offset-4 hover:underline"
        >
          {mode === "signup" ? "Sign in" : "Create a school workspace"}
        </Link>
      </p>
    </form>
  );
}
