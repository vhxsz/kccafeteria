import { getDemoWeekMenu } from "@/lib/cafeteria/demo";
import type { StudentWeekMenu } from "@/lib/cafeteria/types";
import { createClient } from "@/lib/supabase/server";

export function getMonday(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result.toISOString().slice(0, 10);
}

export async function getStudentWeekMenu(
  tagCode: string,
  weekStart = getMonday(),
): Promise<StudentWeekMenu | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return getDemoWeekMenu(tagCode, weekStart);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("resolve_week_menu", {
      p_tag_code: tagCode.toLowerCase(),
      p_week_start: weekStart,
    });
    if (error) {
      console.error("Unable to load the weekly menu:", error.message);
      return getDemoWeekMenu(tagCode, weekStart);
    }
    if (!data && tagCode.toLowerCase() === "tag14") {
      return getDemoWeekMenu(tagCode, weekStart);
    }
    return data as StudentWeekMenu | null;
  } catch (error) {
    console.error("Unable to initialize the weekly menu:", error);
    return getDemoWeekMenu(tagCode, weekStart);
  }
}
