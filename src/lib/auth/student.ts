import type { User } from "@supabase/supabase-js";

export function isKingswayGoogleStudent(user: User | null | undefined): user is User {
  return Boolean(
    user?.email?.toLowerCase().match(/^[^@\s]+@kingsway\.college$/) &&
    user.email_confirmed_at &&
    user.app_metadata?.provider === "google" &&
    user.identities?.some((identity) => identity.provider === "google"),
  );
}

export function safeStudentDestination(value: string | null | undefined) {
  return value && /^\/site\/rate\/[a-z0-9_-]{3,64}$/i.test(value)
    ? value
    : "/site/rate/tag14";
}
