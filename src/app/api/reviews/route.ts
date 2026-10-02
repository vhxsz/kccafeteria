import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  tagCode: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  menuId: z.uuid(),
  overallRating: z.number().int().min(1).max(5),
  itemRatings: z
    .array(
      z.object({
        foodItemId: z.string().min(1).max(100),
        rating: z.number().int().min(1).max(5),
      }),
    )
    .max(30),
  tags: z.array(z.string().trim().min(1).max(50)).max(12),
  comment: z.string().trim().max(280),
  idempotencyKey: z.uuid(),
});

export async function POST(request: NextRequest) {
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Invalid feedback data." }, { status: 400 });
  }

  const supabase = await createClient();

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const anonymousSignal = forwardedFor || request.headers.get("user-agent") || "unknown";
  const secret = process.env.REVIEW_HASH_SECRET || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
    const message =
      error.message.includes("review_limit_reached")
        ? "You have already submitted feedback for this meal."
        : "We could not save your feedback. Please try again.";
    return Response.json({ error: message }, { status: 422 });
  }

  return Response.json({ accepted: true }, { status: 201 });
}
