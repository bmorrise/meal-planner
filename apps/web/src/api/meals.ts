import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';
import { Meal } from '../types/domain';

const mealsKey = ['meals'];

interface UpsertMealInput {
  name: string;
  notes?: string;
  ingredients: Array<{
    name: string;
    quantity?: string;
    unit?: string;
  }>;
}

export const useMeals = () =>
  useQuery({
    queryKey: mealsKey,
    queryFn: async () => {
      const { data } = await http.get<Meal[]>('/meals');
      return data;
    }
  });

export const useCreateMeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertMealInput) => {
      const { data } = await http.post<Meal>('/meals', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mealsKey });
    }
  });
};

export const useUpdateMeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpsertMealInput & { id: string }) => {
      const { data } = await http.put<Meal>(`/meals/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mealsKey });
    }
  });
};

export const useDeleteMeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/meals/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mealsKey });
      void queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    }
  });
};
