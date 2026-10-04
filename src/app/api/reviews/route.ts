import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
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

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const anonymousSignal = `${forwardedFor || "unknown"}:${request.headers.get("user-agent") || "unknown"}`;
  const secret = process.env.REVIEW_HASH_SECRET;
  if (!secret || secret.length < 32) {
    console.error("REVIEW_HASH_SECRET must contain at least 32 characters.");
    return Response.json({ error: "Feedback is temporarily unavailable." }, { status: 503 });
  }

  const anonymousHash = createHash("sha256")
    .update(secret + ":" + anonymousSignal)
    .digest("hex");

  const { error } = await supabase.rpc("submit_public_review", {
    p_tag_code: parsed.data.tagCode.toLowerCase(),
    p_menu_id: parsed.data.menuId,
    p_overall_rating: parsed.data.overallRating,
    p_item_ratings: parsed.data.itemRatings,
    p_tag_names: parsed.data.tags,
    p_comment: parsed.data.comment || null,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_anonymous_hash: anonymousHash,
  });

  if (error) {
    if (error.message.includes("review_limit_reached")) {
      return Response.json(
        { error: "You have already submitted feedback for this meal.", code: "review_limit_reached" },
        { status: 429 },
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
    if (error.message.includes("duplicate key")) {
      return Response.json(
        { error: "This feedback has already been submitted.", code: "duplicate_review" },
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
