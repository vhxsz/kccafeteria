import { getDemoExperience } from "@/lib/cafeteria/demo";
import type { TableExperience } from "@/lib/cafeteria/types";
import { createClient } from "@/lib/supabase/server";

export async function getTableExperience(tagCode: string): Promise<TableExperience | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return getDemoExperience(tagCode);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("resolve_table_experience", {
      p_tag_code: tagCode.toLowerCase(),
    });

    if (error) {
      console.error("Unable to resolve cafeteria tag:", error.message);
      return null;
    }

    return data as TableExperience;
  } catch (error) {
    console.error("Unable to initialize Supabase:", error);
    return getDemoExperience(tagCode);
  }
}
