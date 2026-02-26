import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InventoryItem } from '../types/domain';
import { http } from './http';

const inventoryKey = ['inventory'];

interface CreateInventoryItemInput {
  name: string;
  quantity?: string;
  unit?: string;
}

export const useInventory = () =>
  useQuery({
    queryKey: inventoryKey,
    queryFn: async () => {
      const { data } = await http.get<InventoryItem[]>('/inventory');
      return data;
    }
  });

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInventoryItemInput) => {
      const { data } = await http.post<InventoryItem>('/inventory', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKey });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    }
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/inventory/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKey });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    }
  });
};

export const useReceiveInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInventoryItemInput) => {
      const { data } = await http.post<InventoryItem>('/inventory/receive', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKey });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    }
  });
};
