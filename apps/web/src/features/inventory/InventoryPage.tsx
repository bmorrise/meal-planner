import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useMemo, useState } from 'react';
import { useCreateInventoryItem, useDeleteInventoryItem, useInventory } from '../../api/inventory';

export const InventoryPage = () => {
  const { data: inventoryItems, isLoading } = useInventory();
  const createInventoryItem = useCreateInventoryItem();
  const deleteInventoryItem = useDeleteInventoryItem();

  const [searchValue, setSearchValue] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnit, setItemUnit] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return inventoryItems ?? [];
    }

    return (inventoryItems ?? []).filter((item) => {
      const unitValue = item.unit?.toLowerCase() ?? '';
      return item.name.toLowerCase().includes(normalizedSearch) || unitValue.includes(normalizedSearch);
    });
  }, [inventoryItems, searchValue]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0">
        <h2 className="text-2xl font-semibold text-slate-900">Inventory</h2>
        <p className="text-sm text-slate-600">Track what you currently have at home.</p>
      </div>

      <div className="shrink-0 relative">
        <i className="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <InputText
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search inventory items"
          className="w-full pl-10"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="5" />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {!filteredItems.length ? (
                <p className="px-2 py-3 text-sm text-slate-500">No inventory items found.</p>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div>
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.quantity ?? 'No quantity'}
                          {item.unit ? ` ${item.unit}` : ''}
                        </div>
                      </div>
                      <Button
                        icon="pi pi-trash"
                        text
                        severity="danger"
                        aria-label={`Delete ${item.name}`}
                        onClick={async () => {
                          await deleteInventoryItem.mutateAsync(item.id);
                        }}
                        loading={deleteInventoryItem.isPending}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white p-3">
              <form
                className="grid gap-2 md:grid-cols-[1fr_120px_120px_auto]"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const name = itemName.trim();
                  if (!name) {
                    return;
                  }
                  await createInventoryItem.mutateAsync({
                    name,
                    quantity: itemQuantity.trim() || undefined,
                    unit: itemUnit.trim() || undefined
                  });
                  setItemName('');
                  setItemQuantity('1');
                  setItemUnit('');
                }}
              >
                <InputText
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  placeholder="Item name"
                />
                <InputText
                  value={itemQuantity}
                  onChange={(event) => setItemQuantity(event.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  keyfilter="int"
                  placeholder="Qty"
                />
                <InputText
                  value={itemUnit}
                  onChange={(event) => setItemUnit(event.target.value)}
                  placeholder="Unit"
                />
                <Button type="submit" icon="pi pi-plus" label="Add" loading={createInventoryItem.isPending} />
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
