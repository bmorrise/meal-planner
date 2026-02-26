import { useMutation } from '@tanstack/react-query';
import { MealSuggestion } from '../types/domain';
import { http } from './http';

export const useSuggestRecipe = () =>
  useMutation({
    mutationFn: async () => {
      const { data } = await http.post<MealSuggestion>('/meal-suggestions/suggest');
      return data;
    }
  });
