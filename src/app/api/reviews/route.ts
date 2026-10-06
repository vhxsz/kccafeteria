import { NextRequest } from "next/server";
import { z } from "zod";
import { isKingswayGoogleStudent } from "@/lib/auth/student";
import { createClient } from "@/lib/supabase/server";
import { exceedsContentLength, rejectCrossOrigin } from "@/lib/security/request";

const reviewSchema = z.object({
  tagCode: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  menuId: z.uuid(),
  overallRating: z.number().int().min(1).max(5),
  itemRatings: z
    .array(
      z.object({
        foodItemId: z.uuid(),
        rating: z.number().int().min(1).max(5),
      }),
    )
    .min(1)
    .max(30)
    .refine(
      (items) => new Set(items.map((item) => item.foodItemId)).size === items.length,
      { message: "Food ratings must be unique." },
    ),
  tags: z.array(z.string().trim().min(1).max(50)).max(12),
  comment: z.string().trim().max(280),
  idempotencyKey: z.uuid(),
});

export async function POST(request: NextRequest) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "JSON is required." }, { status: 415 });
  }
  if (exceedsContentLength(request, 32 * 1024)) {
    return Response.json({ error: "Feedback payload is too large." }, { status: 413 });
  }

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Invalid feedback data." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Sign in with your Kingsway College Google account to vote.", code: "sign_in_required" },
      { status: 401 },
    );
  }
  if (!isKingswayGoogleStudent(user)) {
    return Response.json(
      { error: "Only verified @kingsway.college Google accounts can vote.", code: "school_account_required" },
      { status: 403 },
    );
  }

  const { error } = await supabase.rpc("submit_verified_review", {
    p_tag_code: parsed.data.tagCode.toLowerCase(),
    p_menu_id: parsed.data.menuId,
    p_overall_rating: parsed.data.overallRating,
    p_item_ratings: parsed.data.itemRatings,
    p_tag_names: parsed.data.tags,
    p_comment: parsed.data.comment || null,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) {
    if (error.message.includes("review_already_submitted") || error.code === "23505") {
      return Response.json(
        { error: "You have already submitted feedback for this meal.", code: "review_limit_reached" },
        { status: 409 },
      );
    }
    if (error.message.includes("school_google_login_required")) {
      return Response.json(
        { error: "Sign in with your Kingsway College Google account to vote.", code: "school_account_required" },
        { status: 403 },
      );
    }
    if (
      error.message.includes("inactive_or_invalid_meal") ||
      error.message.includes("food_not_in_menu")
    ) {
      return Response.json(
        {
          error: "The menu changed while this page was open. Refresh the page and try again.",
          code: "stale_menu",
        },
        { status: 409 },
      );
    }
    console.error("Unable to save public review:", error.message);
    return Response.json(
      { error: "We could not save your feedback. Please try again.", code: "review_failed" },
      { status: 422 },
    );
  }

  return Response.json({ accepted: true }, { status: 201 });
}
