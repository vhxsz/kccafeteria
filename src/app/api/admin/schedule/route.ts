import { z } from "zod";
import { getAdminContext } from "@/lib/auth/admin-context";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const saveSchema = z.object({
  schedule: z.record(
    z.string().regex(datePattern),
    z.record(z.string(), z.array(z.uuid()).max(30)),
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
      .select("id, name")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId)
      .eq("active", true),
    context.supabase
      .from("menus")
      .select("id, service_date, meal_period_id")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId)
      .gte("service_date", start)
      .lte("service_date", end),
  ]);

  const menus = menusResult.data || [];
  const menuIds = menus.map((menu) => menu.id);
  const menuItemsResult = menuIds.length
    ? await context.supabase
        .from("menu_items")
        .select("menu_id, food_item_id, sort_order")
        .in("menu_id", menuIds)
        .order("sort_order")
    : { data: [], error: null };

  const mealNames = new Map((mealsResult.data || []).map((meal) => [meal.id, meal.name]));
  const schedule: Record<string, Record<string, string[]>> = {};

  menus.forEach((menu) => {
    const mealName = mealNames.get(menu.meal_period_id);
    if (!mealName) return;
    schedule[menu.service_date] ||= {};
    schedule[menu.service_date][mealName] = (menuItemsResult.data || [])
      .filter((item) => item.menu_id === menu.id)
      .map((item) => item.food_item_id);
  });

  return Response.json({
    dishes: dishesResult.data || [],
    schedule,
  });
}

export async function PUT(request: Request) {
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid schedule data." }, { status: 400 });

  const { data: mealPeriods, error: mealError } = await context.supabase
    .from("meal_periods")
    .select("id, name")
    .eq("school_id", context.schoolId)
    .eq("cafeteria_id", context.cafeteriaId)
    .eq("active", true);
  if (mealError) return Response.json({ error: mealError.message }, { status: 400 });

  for (const [serviceDate, meals] of Object.entries(parsed.data.schedule)) {
    for (const mealPeriod of mealPeriods) {
      const dishIds = meals[mealPeriod.name] || [];
      const { data: menu, error: menuError } = await context.supabase
        .from("menus")
        .upsert(
          {
            school_id: context.schoolId,
            cafeteria_id: context.cafeteriaId,
            meal_period_id: mealPeriod.id,
            service_date: serviceDate,
            published: true,
          },
          { onConflict: "cafeteria_id,meal_period_id,service_date" },
        )
        .select("id")
        .single();
      if (menuError) return Response.json({ error: menuError.message }, { status: 400 });

      const { error: deleteError } = await context.supabase
        .from("menu_items")
        .delete()
        .eq("menu_id", menu.id)
        .eq("school_id", context.schoolId);
      if (deleteError) return Response.json({ error: deleteError.message }, { status: 400 });

      if (dishIds.length) {
        const { error: insertError } = await context.supabase
          .from("menu_items")
          .insert(
            dishIds.map((foodItemId, index) => ({
              menu_id: menu.id,
              food_item_id: foodItemId,
              school_id: context.schoolId,
              sort_order: index,
            })),
          );
        if (insertError) return Response.json({ error: insertError.message }, { status: 400 });
      }
    }
  }

  return Response.json({ saved: true });
}
