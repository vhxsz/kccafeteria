import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock3, ShieldCheck, Star, UsersRound, UtensilsCrossed } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminContext } from "@/lib/auth/admin-context";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

type SchoolUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: "student" | "cafeteria_manager" | "school_admin" | "platform_admin";
  joined_at: string;
  vote_count: number;
  last_vote_at: string | null;
  last_vote_rating: number | null;
  last_vote_comment: string | null;
  last_service_date: string | null;
  last_meal_name: string | null;
  last_dishes: string[] | null;
};

function formatDate(value: string | null, timezone: string, includeTime = true) {
  if (!value) return "No votes yet";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function roleLabel(role: SchoolUser["role"]) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function AdminUsersPage() {
  const context = await getAdminContext();
  if (!context) redirect("/login?next=/admin/users");

  const [schoolResult, usersResult] = await Promise.all([
    context.supabase.from("schools").select("timezone").eq("id", context.schoolId).single(),
    context.supabase.rpc("get_school_users_with_latest_review"),
  ]);
  if (schoolResult.error) {
    throw new Error("User activity could not be loaded.");
  }

  const timezone = schoolResult.data?.timezone || "America/Toronto";
  // A deployment can reach Vercel before its accompanying Supabase migration
  // has been run. Keep the staff shell usable and explain the missing setup
  // instead of throwing a production Server Components error.
  const usersLoadError = usersResult.error;
  const users = (usersResult.data || []) as SchoolUser[];
  const students = users.filter((user) => user.role === "student");
  const voters = users.filter((user) => user.vote_count > 0);
  const latestVote = users.find((user) => user.last_vote_at)?.last_vote_at || null;

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1500px] p-5 sm:p-8 lg:p-10">
        <p className="text-sm font-semibold text-tomato">School directory</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Users & voting activity</h1>
        <p className="mt-2 max-w-3xl text-ink/50">
          Kingsway accounts and their latest submitted meal feedback. This staff-only view never appears in the student experience.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl bg-moss p-5 text-white shadow-sm">
            <UsersRound size={19} className="text-white/70" />
            <p className="mt-6 text-4xl font-bold tracking-[-0.05em]">{students.length}</p>
            <p className="mt-2 text-sm text-white/65">Student accounts</p>
          </article>
          <article className="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm">
            <Star size={19} className="text-tomato" />
            <p className="mt-6 text-4xl font-bold tracking-[-0.05em]">{voters.length}</p>
            <p className="mt-2 text-sm text-ink/50">Students who have voted</p>
          </article>
          <article className="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm">
            <Clock3 size={19} className="text-moss" />
            <p className="mt-6 text-xl font-bold tracking-[-0.03em]">{formatDate(latestVote, timezone)}</p>
            <p className="mt-2 text-sm text-ink/50">Most recent student vote</p>
          </article>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-ink/8 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-sm text-ink/45">Newest activity first</p>
              <h2 className="mt-1 text-xl font-bold">All school users</h2>
            </div>
            <span className="w-fit rounded-full bg-tomato/10 px-3 py-1.5 text-sm font-bold text-tomato">{users.length} total</span>
          </div>
          {usersLoadError ? (
            <div className="px-6 py-12 sm:px-7">
              <h3 className="font-bold">User activity needs one database update</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">
                Run the latest MealUp migration in Supabase SQL Editor, then refresh this page. No student data is exposed until the staff-only directory has been installed.
              </p>
            </div>
          ) : users.length ? (
            <div className="divide-y divide-ink/8">
              {users.map((user) => (
                <article key={user.user_id} className="grid gap-4 px-5 py-5 sm:px-7 xl:grid-cols-[minmax(220px,1fr)_150px_150px_minmax(300px,1.5fr)] xl:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{user.display_name || user.email || "Kingsway user"}</p>
                    <p className="mt-1 truncate text-sm text-ink/45">{user.email || "Email unavailable"}</p>
                    <p className="mt-2 text-xs text-ink/35">Joined {formatDate(user.joined_at, timezone, false)}</p>
                  </div>
                  <div>
                    <span className={"inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold " + (user.role === "student" ? "bg-sage/20 text-moss" : "bg-sun/25 text-ink")}>
                      <ShieldCheck size={14} /> {roleLabel(user.role)}
                    </span>
                    <p className="mt-2 text-sm text-ink/50">{user.vote_count} submitted vote{user.vote_count === 1 ? "" : "s"}</p>
                  </div>
                  <div>
                    {user.last_vote_rating ? <p className="flex items-center gap-1 font-bold"><Star size={16} className="fill-tomato text-tomato" /> {user.last_vote_rating.toFixed(1)}</p> : <p className="font-semibold text-ink/35">No vote yet</p>}
                    <p className="mt-1 text-sm text-ink/45">{formatDate(user.last_vote_at, timezone)}</p>
                  </div>
                  <div className="rounded-2xl bg-cream/80 p-4">
                    {user.last_vote_at ? <>
                      <p className="flex items-center gap-2 text-sm font-bold"><UtensilsCrossed size={15} className="text-tomato" /> {user.last_meal_name || "Meal"}{user.last_service_date ? ` · ${formatDate(user.last_service_date, timezone, false)}` : ""}</p>
                      <p className="mt-2 text-sm text-ink/55">{user.last_dishes?.join(", ") || "Meal items unavailable"}</p>
                      {user.last_vote_comment ? <p className="mt-2 text-sm leading-6 text-ink/70">“{user.last_vote_comment}”</p> : null}
                    </> : <p className="text-sm text-ink/45">No feedback has been submitted yet.</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <UsersRound className="mx-auto text-ink/25" size={32} />
              <h3 className="mt-4 font-bold">No school accounts yet</h3>
              <p className="mt-2 text-sm text-ink/50">Students will appear here after their first Kingsway Google sign-in.</p>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
