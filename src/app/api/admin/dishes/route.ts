import { z } from "zod";
import { getAdminContext } from "@/lib/auth/admin-context";
import { exceedsContentLength, rejectCrossOrigin } from "@/lib/security/request";

const imageBucket = "meal-images";
const maximumImageSize = 4 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasValidImageSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  if (type === "image/webp") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

const dishSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(["main_dish", "side", "salad", "dessert", "fruit", "bread", "drink", "other"]),
  description: z.string().trim().max(500).default(""),
  ingredients: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  allergens: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  dietaryInformation: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  servingSize: z.string().trim().max(100).default(""),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await context.supabase
    .from("food_items")
    .select("id, name, category, image_url, description, ingredients, allergens, dietary_information, serving_size")
    .eq("school_id", context.schoolId)
    .eq("active", true)
    .order("name");

  if (error) {
    console.error("Unable to load dishes:", error.message);
    return Response.json({ error: "Dishes could not be loaded." }, { status: 500 });
  }
  return Response.json({ dishes: data || [] });
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (exceedsContentLength(request, 5 * 1024 * 1024)) {
    return Response.json({ error: "Upload is too large." }, { status: 413 });
  }
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
  const imageBuffer = await image.arrayBuffer();
  if (!hasValidImageSignature(new Uint8Array(imageBuffer), image.type)) {
    return Response.json({ error: "The selected file is not a valid image." }, { status: 400 });
  }

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const imagePath = `${context.schoolId}/${crypto.randomUUID()}.${extensionByType[image.type]}`;
  const { error: uploadError } = await context.supabase.storage
    .from(imageBucket)
    .upload(imagePath, imageBuffer, {
      contentType: image.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("Photo upload failed:", uploadError.message);
    return Response.json({ error: "The photo could not be uploaded." }, { status: 500 });
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
    console.error("Unable to create dish:", error.message);
    return Response.json({ error: "The dish could not be created." }, { status: 500 });
  }
  return Response.json({ dish: data }, { status: 201 });
}
