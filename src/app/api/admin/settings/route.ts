import { z } from "zod";
import { getAdminContext } from "@/lib/auth/admin-context";
import { exceedsContentLength, rejectCrossOrigin } from "@/lib/security/request";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const settingsSchema = z.object({
  schoolName: z.string().trim().min(2).max(120),
  cafeteriaName: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(3).max(80),
  diningArea: z.string().trim().min(2).max(80),
  mealPeriods: z
    .array(
      z
        .object({
          id: z.uuid(),
          name: z.string().trim().min(1).max(60),
          startsAt: z.string().regex(timePattern),
          endsAt: z.string().regex(timePattern),
        })
        .refine((period) => period.startsAt < period.endsAt, {
          message: "A meal must end after it starts.",
        }),
    )
    .min(1)
    .max(12),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const [schoolResult, cafeteriaResult, diningAreaResult, mealsResult] = await Promise.all([
    context.supabase
      .from("schools")
      .select("name, timezone")
      .eq("id", context.schoolId)
      .single(),
    context.supabase
      .from("cafeterias")
      .select("name")
      .eq("id", context.cafeteriaId)
      .single(),
    context.supabase
      .from("dining_areas")
      .select("id, name")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId)
      .eq("active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    context.supabase
      .from("meal_periods")
      .select("id, name, starts_at, ends_at, sort_order")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId)
      .eq("active", true)
      .order("sort_order"),
  ]);

  const error = schoolResult.error || cafeteriaResult.error || mealsResult.error;
  if (error) {
    console.error("Unable to load settings:", error.message);
    return Response.json({ error: "Settings could not be loaded." }, { status: 500 });
  }

  return Response.json({
    schoolName: schoolResult.data.name,
    cafeteriaName: cafeteriaResult.data.name,
    timezone: schoolResult.data.timezone,
    diningArea: diningAreaResult.data?.name || "Main hall",
    mealPeriods: (mealsResult.data || []).map((period) => ({
      id: period.id,
      name: period.name,
      startsAt: String(period.starts_at).slice(0, 5),
      endsAt: String(period.ends_at).slice(0, 5),
    })),
  });
}

export async function PUT(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (exceedsContentLength(request, 64 * 1024)) {
    return Response.json({ error: "Settings payload is too large." }, { status: 413 });
  }
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Invalid settings." },
      { status: 400 },
    );
  }

  const settings = parsed.data;
  const [schoolResult, cafeteriaResult, diningAreaResult] = await Promise.all([
    context.supabase
      .from("schools")
      .update({ name: settings.schoolName, timezone: settings.timezone })
      .eq("id", context.schoolId),
    context.supabase
      .from("cafeterias")
      .update({ name: settings.cafeteriaName })
      .eq("id", context.cafeteriaId)
      .eq("school_id", context.schoolId),
    context.supabase
      .from("dining_areas")
      .select("id")
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId)
      .eq("active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const baseError = schoolResult.error || cafeteriaResult.error || diningAreaResult.error;
  if (baseError) {
    console.error("Unable to save workspace settings:", baseError.message);
    return Response.json({ error: "Settings could not be saved." }, { status: 500 });
  }

  const areaResult = diningAreaResult.data
    ? await context.supabase
        .from("dining_areas")
        .update({ name: settings.diningArea })
        .eq("id", diningAreaResult.data.id)
        .eq("school_id", context.schoolId)
    : await context.supabase.from("dining_areas").insert({
        school_id: context.schoolId,
        cafeteria_id: context.cafeteriaId,
        name: settings.diningArea,
      });

  if (areaResult.error) {
    console.error("Unable to save dining area:", areaResult.error.message);
    return Response.json({ error: "Settings could not be saved." }, { status: 500 });
  }

  for (const period of settings.mealPeriods) {
    const { error } = await context.supabase
      .from("meal_periods")
      .update({ starts_at: period.startsAt, ends_at: period.endsAt })
      .eq("id", period.id)
      .eq("school_id", context.schoolId)
      .eq("cafeteria_id", context.cafeteriaId);

    if (error) {
      console.error("Unable to save meal period:", error.message);
      return Response.json({ error: "Meal times could not be saved." }, { status: 500 });
    }
  }

  return Response.json({ saved: true });
}
