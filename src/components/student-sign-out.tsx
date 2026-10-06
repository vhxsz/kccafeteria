"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function StudentSignOut({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setBusy(true);
    setError("");
    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) {
      setError("Could not sign out. Please try again.");
      setBusy(false);
      return;
    }
    router.replace(`/student/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  return <span className="inline-flex flex-col items-end gap-1">
    <button type="button" onClick={signOut} disabled={busy} className="text-xs font-bold text-moss underline underline-offset-4 disabled:opacity-50">{busy ? "Signing out..." : "Switch account"}</button>
    {error ? <span role="alert" className="text-xs text-red-700">{error}</span> : null}
  </span>;
}
