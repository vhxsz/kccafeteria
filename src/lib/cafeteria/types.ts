export type FoodCategory =
  | "Main dish"
  | "Side"
  | "Vegetable"
  | "Fruit"
  | "Dessert"
  | "Drink";

export type MenuFoodItem = {
  id: string;
  name: string;
  category: FoodCategory;
  imageUrl: string;
};

export type MealExperience = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

export type TableExperience = {
  schoolName: string;
  cafeteriaName: string;
  tableNumber: number;
  tagCode: string;
  timezone: string;
  serviceDate: string;
  meal: MealExperience | null;
  menuId: string | null;
  items: MenuFoodItem[];
  isDemo?: boolean;
};
