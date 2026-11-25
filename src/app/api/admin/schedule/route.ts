import { z } from "zod";
import { getAdminContext } from "@/lib/auth/admin-context";
import { exceedsContentLength, rejectCrossOrigin } from "@/lib/security/request";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const mealTimeSchema = z
  .object({
    startsAt: z.string().regex(timePattern),
    endsAt: z.string().regex(timePattern),
  })
  .refine((value) => value.startsAt < value.endsAt, {
    message: "Meal end time must be after its start time.",
  });
const saveSchema = z.object({
  schedule: z
    .record(
      z.string().regex(datePattern),
      z.record(z.string(), z.array(z.uuid()).max(30)),
    )
    .refine((value) => Object.keys(value).length <= 14, {
      message: "Save at most two weeks at a time.",
    }),
  mealTimes: z.record(
    z.string().regex(datePattern),
    z.record(z.string(), mealTimeSchema),
  ),
});

export async function GET(request: Request) {
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start?.match(datePattern) || !end?.match(datePattern)) {
    return Response.json({ error: "Invalid date range." }, { status: 400 });
  }

  const [dishesResult, mealsResult, menusResult] = await Promise.all([
    context.supabase
      .from("food_items")
      .select("id, name, category, image_url, description, ingredients, allergens, dietary_information, serving_size")
      .eq("school_id", context.schoolId)
      .eq("active", true)
      .order("name"),
    context.supabase
      .from("meal_periods")
      .select("id, name, starts_at, ends_at, sort_order")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId)
      .eq("active", true)
      .order("sort_order"),
    context.supabase
      .from("menus")
      .select("id, service_date, meal_period_id, service_starts_at, service_ends_at")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId)
      .gte("service_date", start)
      .lte("service_date", end),
  ]);

  const loadError = dishesResult.error || mealsResult.error || menusResult.error;
  if (loadError) {
    console.error("Unable to load schedule:", loadError.message);
    return Response.json({ error: "The schedule could not be loaded." }, { status: 500 });
  }

  const menus = menusResult.data || [];
  const menuIds = menus.map((menu) => menu.id);
  const menuItemsResult = menuIds.length
    ? await context.supabase
        .from("menu_items")
        .select("menu_id, food_item_id, sort_order")
        .in("menu_id", menuIds)
        .order("sort_order")
    : { data: [], error: null };
  if (menuItemsResult.error) {
    console.error("Unable to load scheduled dishes:", menuItemsResult.error.message);
    return Response.json({ error: "The schedule could not be loaded." }, { status: 500 });
  }

  const mealNames = new Map((mealsResult.data || []).map((meal) => [meal.id, meal.name]));
  const schedule: Record<string, Record<string, string[]>> = {};
  const mealTimes: Record<string, Record<string, { startsAt: string; endsAt: string }>> = {};

  menus.forEach((menu) => {
    const mealName = mealNames.get(menu.meal_period_id);
    if (!mealName) return;
    schedule[menu.service_date] ||= {};
    schedule[menu.service_date][mealName] = (menuItemsResult.data || [])
      .filter((item) => item.menu_id === menu.id)
      .map((item) => item.food_item_id);
    if (menu.service_starts_at && menu.service_ends_at) {
      mealTimes[menu.service_date] ||= {};
      mealTimes[menu.service_date][mealName] = {
        startsAt: String(menu.service_starts_at).slice(0, 5),
        endsAt: String(menu.service_ends_at).slice(0, 5),
      };
    }
  });

  return Response.json({
    dishes: dishesResult.data || [],
    mealPeriods: (mealsResult.data || []).map((period) => ({
      id: period.id,
      name: period.name,
      startsAt: String(period.starts_at).slice(0, 5),
      endsAt: String(period.ends_at).slice(0, 5),
    })),
    schedule,
    mealTimes,
  });
}

export async function PUT(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (exceedsContentLength(request, 256 * 1024)) {
    return Response.json({ error: "Schedule payload is too large." }, { status: 413 });
  }
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid schedule data." }, { status: 400 });

  // One database transaction: a failure leaves the previous week untouched and
  // students never see a half-saved meal.
  const { error } = await context.supabase.rpc("save_week_schedule", {
    p_cafeteria_id: context.cafeteriaId,
    p_schedule: parsed.data.schedule,
    p_meal_times: parsed.data.mealTimes,
  });
  if (error) {
    console.error("Unable to save schedule:", error.message);
    if (error.message.includes("unknown_dish")) {
      return Response.json(
        { error: "A dish in this week is no longer in the food library. Refresh and try again." },
        { status: 409 },
      );
    }
    if (error.message.includes("invalid_meal_time")) {
      return Response.json({ error: "Each meal must end after it starts." }, { status: 400 });
    }
    return Response.json({ error: "The schedule could not be saved." }, { status: 500 });
  }

  return Response.json({ saved: true });
}
