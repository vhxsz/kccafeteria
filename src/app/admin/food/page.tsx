import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { FoodLibraryManager } from "@/components/food-library-manager";
import { getAdminContext } from "@/lib/auth/admin-context";

export const metadata: Metadata = { title: "Food library" };

export default async function FoodLibraryPage() {
  const context = await getAdminContext();
  if (!context) redirect("/login?next=/admin/food");

  const { data } = await context.supabase
    .from("food_items")
    .select("id, name, category, image_url, description, ingredients, allergens, dietary_information, serving_size")
    .eq("school_id", context.schoolId)
    .eq("active", true)
    .order("name");

  return (
    <AdminShell>
      <FoodLibraryManager initialDishes={data || []} />
    </AdminShell>
  );
}
