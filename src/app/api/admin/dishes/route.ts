import { z } from "zod";
import { getAdminContext } from "@/lib/auth/admin-context";

const imageBucket = "meal-images";
const maximumImageSize = 4 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const dishSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(["main_dish", "side", "salad", "dessert", "fruit", "bread", "drink", "other"]),
  description: z.string().trim().max(500).default(""),
  ingredients: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  allergens: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  dietaryInformation: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  servingSize: z.string().trim().max(100).default(""),
});

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const parseStringList = (field: string) => {
    try {
      const value = JSON.parse(String(formData.get(field) || "[]"));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const parsed = dishSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    ingredients: parseStringList("ingredients"),
    allergens: parseStringList("allergens"),
    dietaryInformation: parseStringList("dietaryInformation"),
    servingSize: formData.get("servingSize"),
  });
  if (!parsed.success) return Response.json({ error: "Invalid dish data." }, { status: 400 });

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return Response.json({ error: "Please choose a photo for this dish." }, { status: 400 });
  }
  if (!allowedImageTypes.has(image.type)) {
    return Response.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });
  }
  if (image.size > maximumImageSize) {
    return Response.json({ error: "The photo must be smaller than 4 MB." }, { status: 400 });
  }

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const imagePath = `${context.schoolId}/${crypto.randomUUID()}.${extensionByType[image.type]}`;
  const { error: uploadError } = await context.supabase.storage
    .from(imageBucket)
    .upload(imagePath, await image.arrayBuffer(), {
      contentType: image.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: `Photo upload failed: ${uploadError.message}` }, { status: 400 });
  }

  const { data: publicImage } = context.supabase.storage.from(imageBucket).getPublicUrl(imagePath);

  const { data, error } = await context.supabase
    .from("food_items")
    .insert({
      school_id: context.schoolId,
      name: parsed.data.name,
      category: parsed.data.category,
      image_url: publicImage.publicUrl,
      description: parsed.data.description || null,
      ingredients: parsed.data.ingredients,
      allergens: parsed.data.allergens,
      dietary_information: parsed.data.dietaryInformation,
      serving_size: parsed.data.servingSize || null,
    })
    .select("id, name, category, image_url, description, ingredients, allergens, dietary_information, serving_size")
    .single();

  if (error) {
    await context.supabase.storage.from(imageBucket).remove([imagePath]);
    return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ dish: data }, { status: 201 });
}
