import { createClient } from "@/lib/supabase/server";

const configuredTag = process.env.NEXT_PUBLIC_DEFAULT_MENU_TAG || null;

/**
 * Public pages (menu, rankings) need one active table tag to find the school.
 * Prefer the configured tag while it is active; otherwise use any active table,
 * so deactivating a single table never takes the public pages down.
 */
export async function getPublicTag(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_public_tag", {
    p_preferred: configuredTag,
  });

  if (error) {
    // The migration that adds resolve_public_tag may not be applied yet.
    console.error("Unable to resolve the public table tag:", error.message);
    return configuredTag || "tag14";
  }
  return typeof data === "string" ? data : null;
}
