import type { FoodCategory, TableExperience } from "@/lib/cafeteria/types";

const weeklyMenus: Record<
  string,
  Record<string, Array<[string, FoodCategory, string]>>
> = {
  weekday: {
    Breakfast: [
      ["Scrambled eggs", "Main dish", "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=640&q=80"],
      ["Whole grain toast", "Side", "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=640&q=80"],
      ["Fresh berries", "Fruit", "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=640&q=80"],
      ["Orange juice", "Drink", "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=640&q=80"],
    ],
    Lunch: [
      ["Grilled chicken", "Main dish", "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=640&q=80"],
      ["Herbed rice", "Side", "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=640&q=80"],
      ["Garden salad", "Vegetable", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=80"],
      ["Orange juice", "Drink", "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=640&q=80"],
    ],
    Dinner: [
      ["Tomato basil pasta", "Main dish", "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=640&q=80"],
      ["Roasted vegetables", "Vegetable", "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=640&q=80"],
      ["Garlic bread", "Side", "https://images.unsplash.com/photo-1573140401552-3fab0b24427f?auto=format&fit=crop&w=640&q=80"],
      ["Apple slices", "Fruit", "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=640&q=80"],
    ],
  },
};

const mealWindows = [
  { id: "demo-breakfast", name: "Breakfast", startsAt: "06:30", endsAt: "10:00" },
  { id: "demo-lunch", name: "Lunch", startsAt: "11:30", endsAt: "14:30" },
  { id: "demo-dinner", name: "Dinner", startsAt: "17:00", endsAt: "20:30" },
];

function getSchoolDateParts(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getDemoExperience(tagCode: string): TableExperience {
  const timezone = "America/Toronto";
  const parts = getSchoolDateParts(timezone);
  const time = Number(parts.hour) * 60 + Number(parts.minute);
  const meal =
    mealWindows.find((window) => {
      const [startHour, startMinute] = window.startsAt.split(":").map(Number);
      const [endHour, endMinute] = window.endsAt.split(":").map(Number);
      return time >= startHour * 60 + startMinute && time <= endHour * 60 + endMinute;
    }) ?? mealWindows[1];
  const items = weeklyMenus.weekday[meal.name].map(([name, category, imageUrl], index) => ({
    id: "demo-item-" + index,
    name,
    category,
    imageUrl,
  }));
  const tableMatch = tagCode.match(/\d+/);

  return {
    schoolName: "Greenwood School",
    cafeteriaName: "Main cafeteria",
    tableNumber: tableMatch ? Number(tableMatch[0]) : 14,
    tagCode,
    timezone,
    serviceDate: parts.year + "-" + parts.month + "-" + parts.day,
    meal,
    menuId: "demo-menu-" + meal.name.toLowerCase(),
    items,
    isDemo: true,
  };
}
