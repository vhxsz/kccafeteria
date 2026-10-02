"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  ImagePlus,
  Plus,
  Search,
  X,
} from "lucide-react";

type Dish = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  dietaryInformation: string[];
  servingSize: string;
};

type MealName = "Breakfast" | "Lunch" | "Dinner";
type Schedule = Record<string, Record<MealName, Dish[]>>;

const days = [
  { key: "monday", label: "Monday", date: "Sep 28", isoDate: "2026-09-28" },
  { key: "tuesday", label: "Tuesday", date: "Sep 29", isoDate: "2026-09-29" },
  { key: "wednesday", label: "Wednesday", date: "Sep 30", isoDate: "2026-09-30" },
  { key: "thursday", label: "Thursday", date: "Oct 1", isoDate: "2026-10-01", today: true },
  { key: "friday", label: "Friday", date: "Oct 2", isoDate: "2026-10-02" },
  { key: "saturday", label: "Saturday", date: "Oct 3", isoDate: "2026-10-03" },
  { key: "sunday", label: "Sunday", date: "Oct 4", isoDate: "2026-10-04" },
];

const dishDefaults = {
  description: "Freshly prepared by the cafeteria team.",
  ingredients: [] as string[],
  allergens: [] as string[],
  dietaryInformation: [] as string[],
  servingSize: "",
};

const mealSlots: Array<{ name: MealName; time: string }> = [
  { name: "Breakfast", time: "6:30 – 10:00" },
  { name: "Lunch", time: "11:30 – 14:30" },
  { name: "Dinner", time: "17:00 – 20:30" },
];

const initialDishes: Dish[] = [
  {
    id: "dish-chicken",
    name: "Grilled chicken",
    category: "Main dish",
    ...dishDefaults,
    imageUrl:
      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "dish-pasta",
    name: "Tomato basil pasta",
    category: "Main dish",
    ...dishDefaults,
    imageUrl:
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "dish-salad",
    name: "Garden salad",
    category: "Vegetable",
    ...dishDefaults,
    imageUrl:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "dish-eggs",
    name: "Scrambled eggs",
    category: "Breakfast",
    ...dishDefaults,
    imageUrl:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "dish-pizza",
    name: "Vegetable pizza",
    category: "Main dish",
    ...dishDefaults,
    imageUrl:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=640&q=80",
  },
];

const emptySchedule = Object.fromEntries(
  days.map((day) => [
    day.key,
    { Breakfast: [], Lunch: [], Dinner: [] },
  ]),
) as Schedule;

function normalizeSchedule(value?: Partial<Schedule>): Schedule {
  const normalized = structuredClone(emptySchedule);

  days.forEach((day) => {
    mealSlots.forEach((slot) => {
      const savedItems = value?.[day.key]?.[slot.name];
      normalized[day.key][slot.name] = Array.isArray(savedItems) ? savedItems : [];
    });
  });

  return normalized;
}

const initialSchedule: Schedule = {
  ...emptySchedule,
  monday: {
    Breakfast: [initialDishes[3]],
    Lunch: [initialDishes[0], initialDishes[2]],
    Dinner: [initialDishes[1]],
  },
  tuesday: {
    Breakfast: [initialDishes[3]],
    Lunch: [initialDishes[4], initialDishes[2]],
    Dinner: [initialDishes[0]],
  },
  thursday: {
    Breakfast: [initialDishes[3]],
    Lunch: [initialDishes[0], initialDishes[2]],
    Dinner: [initialDishes[1]],
  },
};

type DragPayload = {
  dishId: string;
  fromDay?: string;
  fromMeal?: MealName;
};

export function WeeklyPlanner() {
  const [dishes, setDishes] = useState(initialDishes);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [search, setSearch] = useState("");
  const [showDishForm, setShowDishForm] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      fetch("/api/admin/schedule?start=2026-09-28&end=2026-10-04")
        .then((response) => response.json())
        .then(
          (payload: {
            dishes?: Array<{
              id: string;
              name: string;
              category: string;
              image_url: string | null;
              description: string | null;
              ingredients: string[];
              allergens: string[];
              dietary_information: string[];
              serving_size: string | null;
            }>;
            schedule?: Record<string, Record<string, string[]>>;
          }) => {
            if (!payload.dishes) return;
            const categoryLabels: Record<string, string> = {
              main_dish: "Main dish",
              side: "Side",
              salad: "Vegetable",
              dessert: "Dessert",
              fruit: "Fruit",
              bread: "Bread",
              drink: "Drink",
              other: "Other",
            };
            const remoteDishes = payload.dishes.map((dish) => ({
              id: dish.id,
              name: dish.name,
              category: categoryLabels[dish.category] || dish.category,
              imageUrl:
                dish.image_url ||
                "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=80",
              description: dish.description || "",
              ingredients: dish.ingredients || [],
              allergens: dish.allergens || [],
              dietaryInformation: dish.dietary_information || [],
              servingSize: dish.serving_size || "",
            }));
            const dishMap = new Map(remoteDishes.map((dish) => [dish.id, dish]));
            const remoteSchedule = structuredClone(emptySchedule);
            days.forEach((day) => {
              mealSlots.forEach((slot) => {
                remoteSchedule[day.key][slot.name] = (
                  payload.schedule?.[day.isoDate]?.[slot.name] || []
                )
                  .map((id) => dishMap.get(id))
                  .filter((dish): dish is Dish => Boolean(dish));
              });
            });
            setDishes(remoteDishes);
            setSchedule(remoteSchedule);
          },
        )
        .catch(() => undefined);
      return;
    }
    const savedDishes = localStorage.getItem("nourish-dishes");
    const savedSchedule = localStorage.getItem("nourish-schedule");
    if (savedDishes || savedSchedule) {
      const frame = window.requestAnimationFrame(() => {
        if (savedDishes) setDishes(JSON.parse(savedDishes) as Dish[]);
        if (savedSchedule) {
          setSchedule(normalizeSchedule(JSON.parse(savedSchedule) as Partial<Schedule>));
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  const filteredDishes = useMemo(
    () =>
      dishes.filter((dish) =>
        dish.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [dishes, search],
  );

  function startDrag(
    event: DragEvent,
    dishId: string,
    fromDay?: string,
    fromMeal?: MealName,
  ) {
    const payload: DragPayload = { dishId, fromDay, fromMeal };
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = fromDay ? "move" : "copy";
  }

  function dropDish(event: DragEvent, targetDay: string, targetMeal: MealName) {
    event.preventDefault();
    const payload = JSON.parse(
      event.dataTransfer.getData("application/json"),
    ) as DragPayload;
    const dish = dishes.find((item) => item.id === payload.dishId);
    if (!dish) return;

    setSchedule((current) => {
      const next = structuredClone(current);
      if (payload.fromDay && payload.fromMeal) {
        next[payload.fromDay][payload.fromMeal] = next[payload.fromDay][
          payload.fromMeal
        ].filter((item) => item.id !== payload.dishId);
      }
      if (!next[targetDay][targetMeal].some((item) => item.id === payload.dishId)) {
        next[targetDay][targetMeal].push(dish);
      }
      return next;
    });
    setSaved(false);
  }

  function removeDish(day: string, meal: MealName, dishId: string) {
    setSchedule((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [meal]: current[day][meal].filter((dish) => dish.id !== dishId),
      },
    }));
    setSaved(false);
  }

  async function addDish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") || "").trim();
    if (!name) return;
    let dish: Dish = {
      id: crypto.randomUUID(),
      name,
      category: String(form.get("category") || "Other"),
      imageUrl:
        String(form.get("imageUrl") || "").trim() ||
        "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=80",
      description: String(form.get("description") || "").trim(),
      ingredients: String(form.get("ingredients") || "").split(",").map((item) => item.trim()).filter(Boolean),
      allergens: form.getAll("allergens").map(String),
      dietaryInformation: form.getAll("dietaryInformation").map(String),
      servingSize: String(form.get("servingSize") || "").trim(),
    };

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      const categoryValues: Record<string, string> = {
        "Main dish": "main_dish",
        Side: "side",
        Vegetable: "salad",
        Fruit: "fruit",
        Dessert: "dessert",
        Drink: "drink",
        Other: "other",
      };
      const response = await fetch("/api/admin/dishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dish.name,
          category: categoryValues[dish.category] || "other",
          imageUrl: String(form.get("imageUrl") || "").trim(),
          description: dish.description,
          ingredients: dish.ingredients,
          allergens: dish.allergens,
          dietaryInformation: dish.dietaryInformation,
          servingSize: dish.servingSize,
        }),
      });
      const payload = (await response.json()) as {
        dish?: {
          id: string; name: string; category: string; image_url: string | null;
          description: string | null; ingredients: string[]; allergens: string[];
          dietary_information: string[]; serving_size: string | null;
        };
      };
      if (!response.ok || !payload.dish) return;
      dish = {
        id: payload.dish.id,
        name: payload.dish.name,
        category: Object.entries(categoryValues).find(([, value]) => value === payload.dish?.category)?.[0] || dish.category,
        imageUrl: payload.dish.image_url || dish.imageUrl,
        description: payload.dish.description || "",
        ingredients: payload.dish.ingredients || [],
        allergens: payload.dish.allergens || [],
        dietaryInformation: payload.dish.dietary_information || [],
        servingSize: payload.dish.serving_size || "",
      };
    }
    setDishes((current) => [...current, dish]);
    setShowDishForm(false);
    formElement.reset();
  }

  async function saveSchedule() {
    localStorage.setItem("nourish-dishes", JSON.stringify(dishes));
    localStorage.setItem("nourish-schedule", JSON.stringify(schedule));

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      const scheduleByDate = Object.fromEntries(
        days.map((day) => [
          day.isoDate,
          Object.fromEntries(
            mealSlots.map((slot) => [
              slot.name,
              schedule[day.key][slot.name].map((dish) => dish.id),
            ]),
          ),
        ]),
      );
      const response = await fetch("/api/admin/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: scheduleByDate }),
      });
      if (!response.ok) return;
    }
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-[1700px] p-5 sm:p-8 lg:p-10">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-tomato">Menu operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            Weekly meal planner
          </h1>
          <p className="mt-2 max-w-2xl text-ink/50">
            Drag dishes into a meal slot. Students only see the published menu
            matching their school&apos;s date and meal time.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-white">
            <ChevronLeft size={18} />
          </button>
          <div className="rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-bold">
            Sep 28 – Oct 4, 2026
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-white">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={saveSchedule}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white hover:bg-moss"
          >
            {saved ? <Check size={17} /> : null}
            {saved ? "Schedule saved" : "Save schedule"}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 2xl:grid-cols-[280px_1fr]">
        <aside id="library" className="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-moss">Drag from here</p>
              <h2 className="mt-1 text-xl font-bold">Dish library</h2>
            </div>
            <button
              onClick={() => setShowDishForm(true)}
              className="grid h-9 w-9 place-items-center rounded-full bg-tomato text-white"
              aria-label="Create a dish"
            >
              <Plus size={18} />
            </button>
          </div>
          <label className="mt-5 flex items-center gap-2 rounded-xl border border-ink/8 bg-cream/50 px-3">
            <Search size={16} className="text-ink/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dishes"
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </label>
          <div className="mt-4 space-y-3">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                draggable
                onDragStart={(event) => startDrag(event, dish.id)}
                className="flex cursor-grab items-center gap-3 rounded-2xl border border-ink/8 bg-white p-2 shadow-sm active:cursor-grabbing"
              >
                <GripVertical size={16} className="shrink-0 text-ink/25" />
                <div
                  className="h-12 w-12 shrink-0 rounded-xl bg-sage/30 bg-cover bg-center"
                  style={{ backgroundImage: "url(" + dish.imageUrl + ")" }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{dish.name}</p>
                  <p className="text-xs text-ink/40">{dish.category}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-ink/40">
            <Clock3 size={14} className="mr-1 inline" />
            Meal hours use America/Toronto for this school.
          </p>
        </aside>

        <div className="overflow-x-auto rounded-3xl border border-ink/8 bg-white shadow-sm">
          <div className="grid min-w-[1540px] grid-cols-7">
            {days.map((day) => (
              <section key={day.key} className="border-r border-ink/8 last:border-r-0">
                <header className={"border-b border-ink/8 p-4 " + (day.today ? "bg-sun/20" : "")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{day.label}</p>
                      <p className="mt-0.5 text-xs text-ink/40">{day.date}</p>
                    </div>
                    {day.today && (
                      <span className="rounded-full bg-tomato px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Today
                      </span>
                    )}
                  </div>
                </header>
                <div className="divide-y divide-ink/8">
                  {mealSlots.map((slot) => (
                    <div
                      key={slot.name}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropDish(event, day.key, slot.name)}
                      className="min-h-52 p-3 transition hover:bg-sage/8"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-[.12em] text-moss">
                          {slot.name}
                        </p>
                        <span className="text-[10px] text-ink/35">{slot.time}</span>
                      </div>
                      <div className="space-y-2">
                        {(schedule[day.key]?.[slot.name] || []).map((dish) => (
                          <div
                            key={dish.id}
                            draggable
                            onDragStart={(event) =>
                              startDrag(event, dish.id, day.key, slot.name)
                            }
                            className="group relative overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-sm"
                          >
                            <div
                              className="h-20 bg-sage/30 bg-cover bg-center"
                              style={{ backgroundImage: "url(" + dish.imageUrl + ")" }}
                            />
                            <div className="p-3">
                              <p className="text-sm font-bold leading-tight">{dish.name}</p>
                              <p className="mt-1 text-[11px] text-ink/40">{dish.category}</p>
                              {dish.servingSize ? <p className="mt-1 text-[10px] text-ink/35">{dish.servingSize}</p> : null}
                            </div>
                            <button
                              onClick={() => removeDish(day.key, slot.name, dish.id)}
                              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition group-hover:opacity-100"
                              aria-label={"Remove " + dish.name}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {(schedule[day.key]?.[slot.name] || []).length === 0 && (
                          <div className="grid min-h-24 place-items-center rounded-2xl border border-dashed border-ink/15 bg-cream/30 px-3 text-center text-xs text-ink/35">
                            Drop a dish here
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {showDishForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-5 backdrop-blur-sm">
          <form
            onSubmit={addDish}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-tomato">Food library</p>
                <h2 className="mt-1 text-2xl font-bold">Create a new dish</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDishForm(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-cream"
              >
                <X size={17} />
              </button>
            </div>
            <label className="mt-6 block text-sm font-bold">
              Dish name
              <input
                required
                name="name"
                placeholder="e.g. Lemon herb chicken"
                className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss"
              />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold">
                Serving size <span className="font-normal text-ink/40">Optional</span>
                <input name="servingSize" placeholder="e.g. 250 g or 1 bowl" className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss" />
              </label>
              <label className="block text-sm font-bold">
                Ingredients <span className="font-normal text-ink/40">Comma separated</span>
                <input name="ingredients" placeholder="Chicken, lemon, herbs" className="mt-2 h-12 w-full rounded-xl border border-ink/10 px-4 font-normal outline-none focus:border-moss" />
              </label>
            </div>
            <label className="mt-4 block text-sm font-bold">
              Description
              <textarea name="description" rows={3} maxLength={500} placeholder="Describe the flavor, preparation, and key ingredients." className="mt-2 w-full rounded-xl border border-ink/10 px-4 py-3 font-normal outline-none focus:border-moss" />
            </label>
            <fieldset className="mt-4">
              <legend className="text-sm font-bold">Allergens</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Gluten", "Dairy", "Eggs", "Peanuts", "Tree nuts", "Soy", "Fish", "Shellfish"].map((item) => (
                  <label key={item} className="flex items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold"><input type="checkbox" name="allergens" value={item} /> {item}</label>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="text-sm font-bold">Dietary information</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-free", "Dairy-free"].map((item) => (
                  <label key={item} className="flex items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold"><input type="checkbox" name="dietaryInformation" value={item} /> {item}</label>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block text-sm font-bold">
              Category
              <select
                name="category"
                className="mt-2 h-12 w-full rounded-xl border border-ink/10 bg-white px-4 font-normal outline-none"
              >
                <option value="Main dish">Main dish</option>
                <option value="Side">Side</option>
                <option value="Vegetable">Vegetable</option>
                <option value="Fruit">Fruit</option>
                <option value="Dessert">Dessert</option>
                <option value="Drink">Drink</option>
              </select>
            </label>
            <label className="mt-4 block text-sm font-bold">
              Photo URL <span className="font-normal text-ink/40">Optional</span>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-ink/10 px-4">
                <ImagePlus size={17} className="text-ink/35" />
                <input
                  name="imageUrl"
                  type="url"
                  placeholder="https://..."
                  className="h-12 w-full font-normal outline-none"
                />
              </div>
            </label>
            <button className="mt-6 w-full rounded-full bg-ink px-5 py-3.5 font-bold text-white hover:bg-moss">
              Add dish to library
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
