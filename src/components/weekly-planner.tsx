"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

type MealSlot = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

type Schedule = Record<string, Record<string, Dish[]>>;
type MealTime = { startsAt: string; endsAt: string };
type ScheduleTimes = Record<string, Record<string, MealTime>>;
type SlotPicker = { day: string; meal: string } | null;
type PlannerDay = {
  key: string;
  label: string;
  date: string;
  isoDate: string;
  today: boolean;
};

const weekdayKeys = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function torontoDateIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(isoDate: string, amount: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(isoDate: string) {
  const weekday = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  return addDays(isoDate, -((weekday + 6) % 7));
}

function createWeekDays(weekStart: string): PlannerDay[] {
  const today = torontoDateIso();
  return weekdayKeys.map((key, index) => {
    const isoDate = addDays(weekStart, index);
    const date = new Date(`${isoDate}T12:00:00Z`);
    return {
      key,
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "UTC",
      }).format(date),
      date: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date),
      isoDate,
      today: isoDate === today,
    };
  });
}

function formatWeekRange(days: PlannerDay[]) {
  const start = new Date(`${days[0].isoDate}T12:00:00Z`);
  const end = new Date(`${days[6].isoDate}T12:00:00Z`);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}

const defaultMealSlots: MealSlot[] = [
  { id: "breakfast", name: "Breakfast", startsAt: "06:30", endsAt: "10:00" },
  { id: "lunch", name: "Lunch", startsAt: "11:30", endsAt: "14:30" },
  { id: "dinner", name: "Dinner", startsAt: "17:00", endsAt: "20:30" },
];

function createEmptySchedule(days: PlannerDay[], slots: MealSlot[]) {
  return Object.fromEntries(
    days.map((day) => [
      day.key,
      Object.fromEntries(slots.map((slot) => [slot.name, [] as Dish[]])),
    ]),
  ) as Schedule;
}

function createDefaultScheduleTimes(days: PlannerDay[], slots: MealSlot[]) {
  return Object.fromEntries(
    days.map((day) => [
      day.key,
      Object.fromEntries(
        slots.map((slot) => [
          slot.name,
          { startsAt: slot.startsAt, endsAt: slot.endsAt },
        ]),
      ),
    ]),
  ) as ScheduleTimes;
}

type DragPayload = {
  dishId: string;
  fromDay?: string;
  fromMeal?: string;
};

export function WeeklyPlanner() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(torontoDateIso()));
  const days = useMemo(() => createWeekDays(weekStart), [weekStart]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [schedule, setSchedule] = useState(() =>
    createEmptySchedule(createWeekDays(startOfWeek(torontoDateIso())), defaultMealSlots),
  );
  const [mealSlots, setMealSlots] = useState(defaultMealSlots);
  const [mealTimes, setMealTimes] = useState(() =>
    createDefaultScheduleTimes(
      createWeekDays(startOfWeek(torontoDateIso())),
      defaultMealSlots,
    ),
  );
  const [search, setSearch] = useState("");
  const [showDishForm, setShowDishForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [dirtyTimeSlots, setDirtyTimeSlots] = useState<Set<string>>(() => new Set());
  const [dishImagePreview, setDishImagePreview] = useState("");
  const [dishFormError, setDishFormError] = useState("");
  const [isCreatingDish, setIsCreatingDish] = useState(false);
  const [slotPicker, setSlotPicker] = useState<SlotPicker>(null);
  const plannerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (dishImagePreview) URL.revokeObjectURL(dishImagePreview);
    };
  }, [dishImagePreview]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve()
      .then(() => {
        setIsLoading(true);
        setLoadError("");
        return fetch(`/api/admin/schedule?start=${days[0].isoDate}&end=${days[6].isoDate}`, {
          signal: controller.signal,
        });
      })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
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
          mealTimes?: Record<string, Record<string, MealTime>>;
          mealPeriods?: MealSlot[];
        };
        if (!response.ok) throw new Error(payload.error || "The schedule could not be loaded.");
        return payload;
      })
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
            mealTimes?: Record<string, Record<string, MealTime>>;
            mealPeriods?: MealSlot[];
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
            const remoteMealSlots = payload.mealPeriods?.length
              ? payload.mealPeriods
              : defaultMealSlots;
            const remoteSchedule = createEmptySchedule(days, remoteMealSlots);
            const remoteMealTimes = createDefaultScheduleTimes(days, remoteMealSlots);
            days.forEach((day) => {
              remoteMealSlots.forEach((slot) => {
                remoteSchedule[day.key][slot.name] = (
                  payload.schedule?.[day.isoDate]?.[slot.name] || []
                )
                  .map((id) => dishMap.get(id))
                  .filter((dish): dish is Dish => Boolean(dish));
                remoteMealTimes[day.key][slot.name] =
                  payload.mealTimes?.[day.isoDate]?.[slot.name] || {
                    startsAt: slot.startsAt,
                    endsAt: slot.endsAt,
                  };
              });
            });
            setDishes(remoteDishes);
            setMealSlots(remoteMealSlots);
            setSchedule(remoteSchedule);
            setMealTimes(remoteMealTimes);
          },
        )
      .catch((error: Error) => {
        if (error.name !== "AbortError") setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [days]);

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
    fromMeal?: string,
  ) {
    const payload: DragPayload = { dishId, fromDay, fromMeal };
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = fromDay ? "move" : "copy";
  }

  function dropDish(event: DragEvent, targetDay: string, targetMeal: string) {
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

  function removeDish(day: string, meal: string, dishId: string) {
    setSchedule((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [meal]: current[day][meal].filter((dish) => dish.id !== dishId),
      },
    }));
    setSaved(false);
  }

  function addDishToSlot(day: string, meal: string, dish: Dish) {
    setSchedule((current) => {
      const existing = current[day]?.[meal] || [];
      if (existing.some((item) => item.id === dish.id)) return current;
      return {
        ...current,
        [day]: {
          ...current[day],
          [meal]: [...existing, dish],
        },
      };
    });
    setSaved(false);
    setSlotPicker(null);
  }

  function autoScrollPlanner(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const container = plannerScrollRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const edgeSize = 90;
    if (event.clientX < bounds.left + edgeSize) {
      container.scrollBy({ left: -24 });
    } else if (event.clientX > bounds.right - edgeSize) {
      container.scrollBy({ left: 24 });
    }
  }

  async function addDish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") || "").trim();
    if (!name) return;
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) {
      setDishFormError("Please choose a photo for this dish.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      setDishFormError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (image.size > 4 * 1024 * 1024) {
      setDishFormError("The photo must be smaller than 4 MB.");
      return;
    }

    setIsCreatingDish(true);
    setDishFormError("");
    try {
      let dish: Dish = {
        id: crypto.randomUUID(),
        name,
        category: String(form.get("category") || "Other"),
        imageUrl: dishImagePreview,
        description: String(form.get("description") || "").trim(),
        ingredients: String(form.get("ingredients") || "").split(",").map((item) => item.trim()).filter(Boolean),
        allergens: form.getAll("allergens").map(String),
        dietaryInformation: form.getAll("dietaryInformation").map(String),
        servingSize: String(form.get("servingSize") || "").trim(),
      };

      const categoryValues: Record<string, string> = {
          "Main dish": "main_dish",
          Side: "side",
          Vegetable: "salad",
          Fruit: "fruit",
          Dessert: "dessert",
          Drink: "drink",
          Other: "other",
      };
      const requestBody = new FormData();
        requestBody.set("name", dish.name);
        requestBody.set("category", categoryValues[dish.category] || "other");
        requestBody.set("image", image);
        requestBody.set("description", dish.description);
        requestBody.set("ingredients", JSON.stringify(dish.ingredients));
        requestBody.set("allergens", JSON.stringify(dish.allergens));
        requestBody.set("dietaryInformation", JSON.stringify(dish.dietaryInformation));
        requestBody.set("servingSize", dish.servingSize);
      const response = await fetch("/api/admin/dishes", {
        method: "POST",
        body: requestBody,
      });
      const payload = (await response.json()) as {
          error?: string;
          dish?: {
            id: string; name: string; category: string; image_url: string | null;
            description: string | null; ingredients: string[]; allergens: string[];
            dietary_information: string[]; serving_size: string | null;
          };
      };
      if (!response.ok || !payload.dish) {
        setDishFormError(payload.error || "Unable to create this dish.");
        return;
      }
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
      setDishes((current) => [...current, dish]);
      setShowDishForm(false);
      setDishImagePreview("");
      setDishFormError("");
      formElement.reset();
    } catch (error) {
      setDishFormError(
        error instanceof Error ? error.message : "Unable to create this dish.",
      );
    } finally {
      setIsCreatingDish(false);
    }
  }

  async function saveSchedule() {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const scheduleByDate = Object.fromEntries(
          days.map((day) => [
            day.isoDate,
            Object.fromEntries(
              mealSlots.map((slot) => [
                slot.name,
                (schedule[day.key]?.[slot.name] || []).map((dish) => dish.id),
              ]),
            ),
          ]),
      );
      const response = await fetch("/api/admin/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schedule: scheduleByDate,
            mealTimes: Object.fromEntries(
              days.map((day) => [day.isoDate, mealTimes[day.key]]),
            ),
          }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "The schedule could not be saved.");
      }

      setSaved(true);
      setDirtyTimeSlots(new Set());
    } catch (error) {
      setSaved(false);
      setSaveError(
        error instanceof Error ? error.message : "The schedule could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
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
            Drag dishes into a meal slot or click an empty slot to choose one.
            Students only see the published menu matching their school&apos;s date
            and meal time.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/10 bg-white"
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="whitespace-nowrap rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-bold">
              {formatWeekRange(days)}
            </div>
            <button
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/10 bg-white"
              aria-label="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={saveSchedule}
            disabled={isSaving || isLoading || Boolean(loadError)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ink px-5 text-sm font-bold text-white hover:bg-moss disabled:cursor-wait disabled:opacity-60"
          >
            {saved && !isSaving ? <Check size={17} /> : null}
            {isSaving ? "Saving…" : saved ? "Schedule saved" : "Save schedule"}
          </button>
        </div>
      </div>

      {saveError ? (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {saveError}
        </p>
      ) : null}
      {loadError ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          <span>{loadError} No local or sample data was substituted.</span>
          <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-white px-4 py-2 text-xs font-bold shadow-sm">
            Try again
          </button>
        </div>
      ) : null}

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
            {isLoading ? <p className="py-6 text-center text-sm text-ink/45">Loading dishes…</p> : null}
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
            {!isLoading && !loadError && filteredDishes.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink/45">No dishes found.</p>
            ) : null}
          </div>
          <p className="mt-5 text-xs leading-5 text-ink/40">
            <Clock3 size={14} className="mr-1 inline" />
            Meal hours use America/Toronto for this school.
          </p>
        </aside>

        <div
          ref={plannerScrollRef}
          onDragOver={autoScrollPlanner}
          className="overflow-x-auto overscroll-x-contain rounded-3xl border border-ink/8 bg-white shadow-sm"
        >
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
                      <div className="mb-3 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-[.12em] text-moss">
                          {slot.name}
                        </p>
                        <div className="flex w-full items-center gap-1.5 text-[10px] text-ink/40">
                          <input
                            type="time"
                            aria-label={`${day.label} ${slot.name} start time`}
                            value={mealTimes[day.key]?.[slot.name]?.startsAt || slot.startsAt}
                            onChange={(event) => {
                              const startsAt = event.target.value;
                              setMealTimes((current) => ({
                                ...current,
                                [day.key]: {
                                  ...current[day.key],
                                  [slot.name]: {
                                    ...current[day.key][slot.name],
                                    startsAt,
                                  },
                                },
                              }));
                              setSaved(false);
                              setSaveError("");
                              setDirtyTimeSlots((current) => {
                                const next = new Set(current);
                                next.add(`${day.key}:${slot.name}`);
                                return next;
                              });
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-cream/50 px-1.5 py-1 font-semibold outline-none focus:border-tomato"
                          />
                          <span>–</span>
                          <input
                            type="time"
                            aria-label={`${day.label} ${slot.name} end time`}
                            value={mealTimes[day.key]?.[slot.name]?.endsAt || slot.endsAt}
                            onChange={(event) => {
                              const endsAt = event.target.value;
                              setMealTimes((current) => ({
                                ...current,
                                [day.key]: {
                                  ...current[day.key],
                                  [slot.name]: {
                                    ...current[day.key][slot.name],
                                    endsAt,
                                  },
                                },
                              }));
                              setSaved(false);
                              setSaveError("");
                              setDirtyTimeSlots((current) => {
                                const next = new Set(current);
                                next.add(`${day.key}:${slot.name}`);
                                return next;
                              });
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-cream/50 px-1.5 py-1 font-semibold outline-none focus:border-tomato"
                          />
                        </div>
                        {dirtyTimeSlots.has(`${day.key}:${slot.name}`) ? (
                          <button
                            type="button"
                            onClick={saveSchedule}
                            disabled={isSaving}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-tomato px-3 py-2 text-xs font-bold text-white transition hover:bg-ink disabled:cursor-wait disabled:opacity-60"
                          >
                            {isSaving ? "Saving time…" : "Save time"}
                          </button>
                        ) : null}
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
                          <button
                            type="button"
                            onClick={() => setSlotPicker({ day: day.key, meal: slot.name })}
                            className="grid min-h-24 w-full place-items-center rounded-2xl border border-dashed border-ink/15 bg-cream/30 px-3 text-center text-xs font-semibold text-ink/45 transition hover:border-tomato/40 hover:bg-tomato/5 hover:text-tomato"
                          >
                            <span><Plus size={16} className="mx-auto mb-1" /> Drop a dish or click to choose</span>
                          </button>
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

      {slotPicker ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-5 backdrop-blur-sm">
          <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-tomato">Choose from food library</p>
                <h2 className="mt-1 text-2xl font-bold">Add a dish to {slotPicker.meal}</h2>
                <p className="mt-1 text-sm text-ink/45">
                  {days.find((day) => day.key === slotPicker.day)?.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSlotPicker(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream"
                aria-label="Close dish picker"
              >
                <X size={17} />
              </button>
            </div>
            {dishes.length ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {dishes.map((dish) => (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => addDishToSlot(slotPicker.day, slotPicker.meal, dish)}
                    className="flex items-center gap-3 rounded-2xl border border-ink/8 p-3 text-left transition hover:border-tomato/35 hover:bg-tomato/5"
                  >
                    <span
                      className="h-16 w-16 shrink-0 rounded-xl bg-sage/30 bg-cover bg-center"
                      style={{ backgroundImage: `url(${dish.imageUrl})` }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{dish.name}</span>
                      <span className="mt-1 block text-xs text-ink/45">{dish.category}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl bg-cream p-6 text-center text-sm text-ink/50">
                Create a dish in the Food library first.
              </p>
            )}
          </section>
        </div>
      ) : null}

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
                onClick={() => {
                  setShowDishForm(false);
                  setDishImagePreview("");
                  setDishFormError("");
                }}
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
              Dish photo
              <span className="ml-2 font-normal text-ink/40">JPEG, PNG, or WebP · max 4 MB</span>
              <span className="mt-2 grid min-h-40 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-ink/20 bg-cream/40 transition hover:border-tomato/50 hover:bg-cream/70">
                {dishImagePreview ? (
                  <span
                    className="block min-h-48 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${dishImagePreview})` }}
                  />
                ) : (
                  <span className="flex flex-col items-center gap-2 px-5 py-8 text-center font-normal text-ink/50">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-tomato/10 text-tomato">
                      <ImagePlus size={22} />
                    </span>
                    <span className="font-bold text-ink">Choose a photo</span>
                    <span className="text-xs">Click to browse files from your device</span>
                  </span>
                )}
                <input
                  required
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setDishFormError("");
                    setDishImagePreview(file ? URL.createObjectURL(file) : "");
                  }}
                />
              </span>
            </label>
            {dishFormError ? (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                {dishFormError}
              </p>
            ) : null}
            <button
              disabled={isCreatingDish}
              className="mt-6 w-full rounded-full bg-ink px-5 py-3.5 font-bold text-white hover:bg-moss disabled:cursor-wait disabled:opacity-60"
            >
              {isCreatingDish ? "Uploading photo…" : "Add dish to library"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
