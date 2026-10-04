import type { StudentWeekMenu } from "@/lib/cafeteria/types";
import { createClient } from "@/lib/supabase/server";

export function getMonday(date = new Date(), timeZone = "America/Toronto") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  const localDateAtNoonUtc = new Date(`${get("year")}-${get("month")}-${get("day")}T12:00:00Z`);
  const weekday = localDateAtNoonUtc.getUTCDay();
  localDateAtNoonUtc.setUTCDate(localDateAtNoonUtc.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
  return localDateAtNoonUtc.toISOString().slice(0, 10);
}

export async function getStudentWeekMenu(
  tagCode: string,
  weekStart = getMonday(),
): Promise<StudentWeekMenu | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error("The cafeteria service is not configured.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_week_menu", {
    p_tag_code: tagCode.toLowerCase(),
    p_week_start: weekStart,
  });
  if (error) {
    console.error("Unable to load the weekly menu:", error.message);
    throw new Error("The weekly menu could not be loaded.");
  }
  return data as StudentWeekMenu | null;
}
