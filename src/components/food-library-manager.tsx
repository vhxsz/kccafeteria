"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, Plus, Search, X } from "lucide-react";

type FoodLibraryDish = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  description: string | null;
  ingredients: string[];
  allergens: string[];
  dietary_information: string[];
  serving_size: string | null;
};

const categories = [
  ["main_dish", "Main dish"],
  ["side", "Side"],
  ["salad", "Vegetable"],
  ["fruit", "Fruit"],
  ["dessert", "Dessert"],
  ["drink", "Drink"],
  ["other", "Other"],
] as const;

const categoryLabels = Object.fromEntries(categories);

export function FoodLibraryManager({ initialDishes }: { initialDishes: FoodLibraryDish[] }) {
  const [dishes, setDishes] = useState(initialDishes);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const filteredDishes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dishes.filter((dish) =>
      `${dish.name} ${categoryLabels[dish.category] || dish.category}`
        .toLowerCase()
        .includes(query),
    );
  }, [dishes, search]);

  function closeForm() {
    setShowForm(false);
    setPreview("");
    setError("");
  }

  async function createDish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const source = new FormData(formElement);
    const image = source.get("image");
    if (!(image instanceof File) || image.size === 0) {
      setError("Please choose a photo for this dish.");
      return;
    }

    const body = new FormData();
    body.set("name", String(source.get("name") || ""));
    body.set("category", String(source.get("category") || "other"));
    body.set("image", image);
    body.set("description", String(source.get("description") || ""));
    body.set(
      "ingredients",
      JSON.stringify(
        String(source.get("ingredients") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
    body.set("allergens", JSON.stringify(source.getAll("allergens").map(String)));
    body.set(
      "dietaryInformation",
      JSON.stringify(source.getAll("dietaryInformation").map(String)),
    );
    body.set("servingSize", String(source.get("servingSize") || ""));

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/dishes", { method: "POST", body });
      const payload = (await response.json()) as { error?: string; dish?: FoodLibraryDish };
      if (!response.ok || !payload.dish) {
        throw new Error(payload.error || "Unable to create this dish.");
      }
      setDishes((current) =>
        [...current, payload.dish as FoodLibraryDish].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      formElement.reset();
      closeForm();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create this dish.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-5 sm:p-8 lg:p-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-tomato">Menu operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Food library</h1>
          <p className="mt-2 max-w-2xl text-ink/50">
            Create and organize the dishes chefs can drag into the weekly planner.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-tomato px-5 text-sm font-bold text-white"
        >
          <Plus size={18} /> Add dish
        </button>
      </div>

      <label className="mt-8 flex items-center gap-3 rounded-2xl border border-ink/8 bg-white px-4 shadow-sm">
        <Search size={18} className="text-ink/35" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search dishes by name or category"
          className="h-12 w-full bg-transparent text-sm outline-none"
        />
      </label>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredDishes.map((dish) => (
          <article key={dish.id} className="overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-sm">
            <div
              className="h-48 bg-sage/25 bg-cover bg-center"
              style={{ backgroundImage: dish.image_url ? `url(${dish.image_url})` : undefined }}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{dish.name}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-tomato">
                    {categoryLabels[dish.category] || dish.category}
                  </p>
                </div>
                {dish.serving_size ? (
                  <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink/55">
                    {dish.serving_size}
                  </span>
                ) : null}
              </div>
              {dish.description ? <p className="mt-3 text-sm leading-6 text-ink/55">{dish.description}</p> : null}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {dish.dietary_information.map((item) => (
                  <span key={item} className="rounded-full bg-moss/10 px-2.5 py-1 text-[11px] font-bold text-moss">{item}</span>
                ))}
                {dish.allergens.map((item) => (
                  <span key={item} className="rounded-full bg-tomato/10 px-2.5 py-1 text-[11px] font-bold text-tomato">Contains {item}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredDishes.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-white p-12 text-center text-ink/45">
          No dishes match your search.
        </div>
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-5 backdrop-blur-sm">
          <form onSubmit={createDish} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between">
              <div><p className="text-sm font-semibold text-tomato">Food library</p><h2 className="mt-1 text-2xl font-bold">Create a new dish</h2></div>
              <button type="button" onClick={closeForm} className="grid h-9 w-9 place-items-center rounded-full bg-cream" aria-label="Close"><X size={17} /></button>
            </div>
            <label className="mt-6 block text-sm font-bold">Dish name<input required name="name" minLength={2} maxLength={100} placeholder="e.g. Lemon herb chicken" className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss" /></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold">Category<select name="category" className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-normal">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="block text-sm font-bold">Serving size <span className="font-normal text-ink/40">Optional</span><input name="servingSize" maxLength={100} placeholder="e.g. 250 g" className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none" /></label>
            </div>
            <label className="mt-4 block text-sm font-bold">Description<textarea name="description" rows={3} maxLength={500} className="mt-2 w-full rounded-xl border border-ink/10 px-4 py-3 font-normal outline-none" /></label>
            <label className="mt-4 block text-sm font-bold">Ingredients <span className="font-normal text-ink/40">Comma separated</span><input name="ingredients" placeholder="Chicken, lemon, herbs" className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none" /></label>
            <fieldset className="mt-4"><legend className="text-sm font-bold">Allergens</legend><div className="mt-2 flex flex-wrap gap-2">{["Gluten", "Dairy", "Eggs", "Peanuts", "Tree nuts", "Soy", "Fish", "Shellfish"].map((item) => <label key={item} className="flex items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold"><input type="checkbox" name="allergens" value={item} /> {item}</label>)}</div></fieldset>
            <fieldset className="mt-4"><legend className="text-sm font-bold">Dietary information</legend><div className="mt-2 flex flex-wrap gap-2">{["Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-free", "Dairy-free"].map((item) => <label key={item} className="flex items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold"><input type="checkbox" name="dietaryInformation" value={item} /> {item}</label>)}</div></fieldset>
            <label className="mt-4 block text-sm font-bold">Dish photo <span className="font-normal text-ink/40">JPEG, PNG, or WebP · max 4 MB</span><span className="mt-2 grid min-h-40 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-ink/20 bg-cream/40">{preview ? <span className="block min-h-48 w-full bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} /> : <span className="flex flex-col items-center gap-2 p-8 text-ink/50"><ImagePlus size={24} /><span className="font-bold text-ink">Choose a photo</span></span>}<input required name="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; setError(""); setPreview(file ? URL.createObjectURL(file) : ""); }} /></span></label>
            {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
            <button disabled={saving} className="mt-6 w-full rounded-full bg-ink px-5 py-3.5 font-bold text-white disabled:opacity-60">{saving ? "Uploading photo…" : "Add dish to library"}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
