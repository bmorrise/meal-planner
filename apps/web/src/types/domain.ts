export interface Ingredient {
  id: string;
  name: string;
  quantity?: string | null;
  unit?: string | null;
}

export interface Meal {
  id: string;
  name: string;
  notes?: string | null;
  lastSelectedAt?: string | null;
  lastPlannedAt?: string | null;
  ingredients: Ingredient[];
}

export interface MealPlanEntry {
  id: string;
  date: string;
  servings: number;
  consumedAt?: string | null;
  mealId: string;
  meal: Meal;
}

export interface ShoppingListItem {
  ingredient: string;
  unit?: string | null;
  quantity?: string | null;
  occurrences: number;
}

export interface AdditionalShoppingItem {
  id: string;
  weekStart: string;
  ingredient: string;
  quantity?: string | null;
  unit?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyShoppingList {
  autoItems: ShoppingListItem[];
  additionalItems: AdditionalShoppingItem[];
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity?: string | null;
  unit?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealSuggestion {
  name: string;
  required: string[];
  optional: string[];
  steps: string[];
  ingredients: Array<{
    name: string;
    quantity?: string | null;
    unit?: string | null;
  }>;
}
