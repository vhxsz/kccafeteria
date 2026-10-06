"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeStudentDestination } from "@/lib/auth/student";

export function StudentGoogleLogin({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    const destination = safeStudentDestination(next);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", destination);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: { hd: "kingsway.college", prompt: "select_account" },
        },
      });
      if (oauthError) throw oauthError;
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Google sign-in is unavailable. Please try again.");
      setBusy(false);
    }
  }

  return <div>
    <button type="button" onClick={signIn} disabled={busy} className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-ink/15 bg-white px-6 py-4 font-bold shadow-sm transition hover:border-moss hover:bg-cream disabled:opacity-50">
      {busy ? <LoaderCircle size={20} className="animate-spin" /> : <span aria-hidden="true" className="text-xl font-black text-[#4285f4]">G</span>}
      {busy ? "Connecting to Google..." : "Continue with Kingsway Google"}
    </button>
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
  </div>;
}
