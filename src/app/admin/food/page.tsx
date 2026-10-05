import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { FoodLibraryManager } from "@/components/food-library-manager";
import { getAdminContext } from "@/lib/auth/admin-context";

export const metadata: Metadata = { title: "Food library" };
export const dynamic = "force-dynamic";

export default async function FoodLibraryPage() {
  const context = await getAdminContext();
  if (!context) redirect("/login?next=/admin/food");

  const { data, error } = await context.supabase
    .from("food_items")
    .select("id, name, category, image_url, description, ingredients, allergens, dietary_information, serving_size")
    .eq("school_id", context.schoolId)
    .eq("active", true)
    .order("name");
  if (error) throw new Error("The food library could not be loaded.");

  return (
    <AdminShell>
      <FoodLibraryManager initialDishes={data || []} />
    </AdminShell>
  );
}
