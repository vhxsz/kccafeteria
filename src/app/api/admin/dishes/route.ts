import { z } from "zod";
import { getAdminContext } from "@/lib/auth/admin-context";

const dishSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(["main_dish", "side", "salad", "dessert", "fruit", "bread", "drink", "other"]),
  imageUrl: z.url().or(z.literal("")),
  description: z.string().trim().max(500).default(""),
  ingredients: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  allergens: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  dietaryInformation: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  servingSize: z.string().trim().max(100).default(""),
});

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = dishSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid dish data." }, { status: 400 });

  const { data, error } = await context.supabase
    .from("food_items")
    .insert({
      school_id: context.schoolId,
      name: parsed.data.name,
      category: parsed.data.category,
      image_url: parsed.data.imageUrl || null,
      description: parsed.data.description || null,
      ingredients: parsed.data.ingredients,
      allergens: parsed.data.allergens,
      dietary_information: parsed.data.dietaryInformation,
      serving_size: parsed.data.servingSize || null,
    })
    .select("id, name, category, image_url, description, ingredients, allergens, dietary_information, serving_size")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ dish: data }, { status: 201 });
}
