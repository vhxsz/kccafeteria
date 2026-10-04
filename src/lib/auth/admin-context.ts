import { createClient } from "@/lib/supabase/server";

const managerRoles = ["cafeteria_manager", "school_admin", "platform_admin"];

export async function getAdminContext() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", userId)
    .eq("active", true)
    .single();

  if (!profile?.school_id || !managerRoles.includes(profile.role)) {
    return null;
  }

  const { data: school } = await supabase
    .from("schools")
    .select("id")
    .eq("id", profile.school_id)
    .eq("active", true)
    .maybeSingle();
  if (!school) return null;

  const { data: cafeteria } = await supabase
    .from("cafeterias")
    .select("id")
    .eq("school_id", profile.school_id)
    .eq("active", true)
    .order("created_at")
    .limit(1)
    .single();

  if (!cafeteria) {
    return null;
  }

  return {
    supabase,
    userId,
    schoolId: profile.school_id as string,
    role: profile.role as string,
    cafeteriaId: cafeteria.id as string,
  };
}
