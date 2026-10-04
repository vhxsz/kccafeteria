import type { TableExperience } from "@/lib/cafeteria/types";
import { createClient } from "@/lib/supabase/server";

export async function getTableExperience(tagCode: string): Promise<TableExperience | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error("The cafeteria service is not configured.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_table_experience", {
    p_tag_code: tagCode.toLowerCase(),
  });

  if (error) {
    console.error("Unable to resolve cafeteria tag:", error.message);
    throw new Error("The cafeteria service could not load this table.");
  }

  return data as TableExperience | null;
}
