import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';
import { AdditionalShoppingItem, MealPlanEntry, WeeklyShoppingList } from '../types/domain';

const plannerKey = (startDate: string) => ['meal-plans', startDate] as const;
const shoppingKey = (startDate: string, includeInventory: boolean) =>
  ['shopping-list', startDate, includeInventory] as const;

export const useMealPlan = (startDate: string) =>
  useQuery({
    queryKey: plannerKey(startDate),
    queryFn: async () => {
      const { data } = await http.get<MealPlanEntry[]>('/meal-plans', {
        params: { startDate }
      });
      return data;
    }
  });

export const useShoppingList = (startDate: string, includeInventory: boolean) =>
  useQuery({
    queryKey: shoppingKey(startDate, includeInventory),
    queryFn: async () => {
      const { data } = await http.get<WeeklyShoppingList>('/meal-plans/shopping-list', {
        params: { startDate, includeInventory }
      });
      return data;
    }
  });

export const useAssignMealToDay = (startDate: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, mealId }: { date: string; mealId: string }) => {
      const { data } = await http.post<MealPlanEntry>('/meal-plans', { date, mealId });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plannerKey(startDate) });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
      void queryClient.invalidateQueries({ queryKey: ['meals'] });
    }
  });
};

export const useUpdateServingsForDay = (startDate: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, servings }: { date: string; servings: number }) => {
      const { data } = await http.put<MealPlanEntry>(`/meal-plans/${encodeURIComponent(date)}/servings`, {
        servings
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plannerKey(startDate) });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    }
  });
};

export const useRemoveMealFromDay = (startDate: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date }: { date: string }) => {
      const { data } = await http.delete<{ deletedCount: number }>(`/meal-plans/${encodeURIComponent(date)}`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plannerKey(startDate) });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
      void queryClient.invalidateQueries({ queryKey: ['meals'] });
    }
  });
};

export const useConsumeMealForDay = (startDate: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date }: { date: string }) => {
      const { data } = await http.post<MealPlanEntry>(`/meal-plans/${encodeURIComponent(date)}/consume`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plannerKey(startDate) });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['meals'] });
    }
  });
};

export const useCreateAdditionalShoppingItem = (startDate: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ingredient: string; quantity?: string; unit?: string }) => {
      const { data } = await http.post<AdditionalShoppingItem>('/meal-plans/shopping-list/additional-items', {
        startDate,
        ...payload
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    }
  });
};

export const useDeleteAdditionalShoppingItem = (startDate: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/meal-plans/shopping-list/additional-items/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    }
  });
};

export const useClearAdditionalShoppingItems = (startDate: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await http.delete<{ deletedCount: number }>('/meal-plans/shopping-list/additional-items', {
        params: { startDate }
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    }
  });
};
