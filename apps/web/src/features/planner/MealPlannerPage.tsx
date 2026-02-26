import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useEffect, useMemo, useRef, useState } from 'react';
import { http } from '../../api/http';
import { useReceiveInventoryItem } from '../../api/inventory';
import { useCreateMeal, useMeals } from '../../api/meals';
import {
  useAssignMealToDay,
  useClearAdditionalShoppingItems,
  useConsumeMealForDay,
  useCreateAdditionalShoppingItem,
  useDeleteAdditionalShoppingItem,
  useMealPlan,
  useRemoveMealFromDay,
  useShoppingList,
  useUpdateServingsForDay
} from '../../api/planner';
import { useWeekRange } from '../../hooks/useWeekRange';
import { Meal, MealPlanEntry } from '../../types/domain';
import { MealModal } from '../meals/MealModal';

export const MealPlannerPage = () => {
  const now = new Date();
  const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'planner' | 'shopping'>('planner');
  const { startDate, endDate, days } = useWeekRange(weekOffset);
  const { data: meals, isLoading: isLoadingMeals } = useMeals();
  const createMeal = useCreateMeal();
  const receiveInventoryItem = useReceiveInventoryItem();
  const { data: planEntries, isLoading: isLoadingPlan } = useMealPlan(startDate);
  const [includeInventory, setIncludeInventory] = useState(true);
  const { data: shoppingList } = useShoppingList(startDate, includeInventory);
  const createAdditionalItem = useCreateAdditionalShoppingItem(startDate);
  const deleteAdditionalItem = useDeleteAdditionalShoppingItem(startDate);
  const clearAdditionalItems = useClearAdditionalShoppingItems(startDate);
  const assignMeal = useAssignMealToDay(startDate);
  const updateServings = useUpdateServingsForDay(startDate);
  const removeMealFromDay = useRemoveMealFromDay(startDate);
  const consumeMealForDay = useConsumeMealForDay(startDate);
  const [draggedMealId, setDraggedMealId] = useState<string | null>(null);
  const [mealSearch, setMealSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [additionalItemName, setAdditionalItemName] = useState('');
  const [additionalItemQty, setAdditionalItemQty] = useState('1');
  const [additionalItemUnit, setAdditionalItemUnit] = useState('');
  const shoppingScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollShoppingToBottom = useRef(false);

  const planByDate = useMemo(() => {
    const map = new Map<string, MealPlanEntry>();
    planEntries?.forEach((entry) => {
      map.set(entry.date, entry);
    });
    return map;
  }, [planEntries]);

  const mealsById = useMemo(() => {
    const map = new Map<string, Meal>();
    meals?.forEach((meal) => {
      map.set(meal.id, meal);
    });
    return map;
  }, [meals]);

  const filteredMeals = useMemo(() => {
    const search = mealSearch.trim().toLowerCase();
    if (!search) {
      return meals ?? [];
    }
    return (meals ?? []).filter((meal) => {
      if (meal.name.toLowerCase().includes(search)) {
        return true;
      }
      return meal.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(search));
    });
  }, [mealSearch, meals]);

  const loading = isLoadingMeals || isLoadingPlan;
  const minServings = 1;
  const maxServings = 10;
  const quantityOptions = Array.from({ length: 10 }, (_, index) => {
    const value = String(index + 1);
    return { label: value, value };
  });
  const shoppingItemCount = (shoppingList?.autoItems.length ?? 0) + (shoppingList?.additionalItems.length ?? 0);

  const onDropMeal = async (date: string, mealId: string) => {
    await assignMeal.mutateAsync({ date, mealId });
  };

  const weekLabel =
    startDate && endDate
      ? `${new Date(`${startDate}T12:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })} - ${new Date(`${endDate}T12:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}`
      : '';

  const downloadShoppingListPdf = async () => {
    const { data } = await http.get('/meal-plans/shopping-list/pdf', {
      params: { startDate, includeInventory },
      responseType: 'blob'
    });

    const blob = new Blob([data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shopping-list-${startDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!shouldScrollShoppingToBottom.current) {
      return;
    }
    const container = shoppingScrollRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    shouldScrollShoppingToBottom.current = false;
  }, [shoppingList?.additionalItems.length]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Meal Planner</h2>
          <p className="text-sm text-slate-600">Drag meals onto each day. Shopping list updates automatically.</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            icon="pi pi-chevron-left"
            text
            aria-label="Previous week"
            onClick={() => setWeekOffset((value) => value - 1)}
          />
          <Button
            label="Current Week"
            outlined
            size="small"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset(0)}
          />
          <Button
            icon="pi pi-chevron-right"
            text
            aria-label="Next week"
            onClick={() => setWeekOffset((value) => value + 1)}
          />
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab('planner')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'planner' ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Planner
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shopping')}
          className={`ml-1 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'shopping' ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Shopping List</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === 'shopping' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {shoppingItemCount}
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'planner' && (loading ? (
          <div className="flex justify-center py-12">
            <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="5" />
          </div>
        ) : (
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="h-full min-h-0 meals-library-card">
            <div className="flex h-full min-h-0 flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-slate-700">Meals Library</h3>
                <Button icon="pi pi-plus" size="small" rounded aria-label="Add Meal" onClick={() => setIsCreateModalOpen(true)} />
              </div>
              <div className="relative mb-3">
                <i className="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <InputText
                  value={mealSearch}
                  onChange={(event) => setMealSearch(event.target.value)}
                  placeholder="Search meals or ingredients"
                  className="w-full pl-10"
                />
              </div>

              <div className="meals-library-scroll min-h-0 flex-1 overflow-y-auto px-1 py-1">
                {filteredMeals.length === 0 ? (
                  <p className="text-sm text-slate-500">No meals match your search.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredMeals.map((meal) => (
                      <div
                        key={meal.id}
                        draggable
                        onDragStart={(event) => {
                          setDraggedMealId(meal.id);
                          event.dataTransfer.setData('text/plain', meal.id);
                          event.dataTransfer.effectAllowed = 'copyMove';
                        }}
                        onDragEnd={() => setDraggedMealId(null)}
                        className="cursor-grab rounded-xl border border-slate-200 bg-slate-50 p-3 active:cursor-grabbing"
                      >
                        <div className="font-medium text-slate-800">{meal.name}</div>
                        <div className="text-xs text-slate-500">
                          Last eaten:{' '}
                          {meal.lastSelectedAt
                            ? new Date(meal.lastSelectedAt).toLocaleDateString('en-US')
                            : 'Never'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="h-full min-h-0 overflow-y-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {days.map((day) => {
                const planned = planByDate.get(day.dateString);
                const resolvedMeal = planned ? mealsById.get(planned.mealId) ?? planned.meal : undefined;
                return (
                  <div
                    key={day.dateString}
                    className={`rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 ${
                      planned ? 'border-solid' : 'border-dashed'
                    }`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={async (event) => {
                      event.preventDefault();
                      const mealId = event.dataTransfer.getData('text/plain') || draggedMealId;
                      if (mealId) {
                        await onDropMeal(day.dateString, mealId);
                      }
                      setDraggedMealId(null);
                    }}
                  >
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-emerald-900">{day.label}</h3>
                    </div>

                    {planned ? (
                      <div className="rounded-xl bg-white p-3 shadow-sm">
                        <div className="font-semibold text-slate-900">{resolvedMeal?.name ?? 'Unknown meal'}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">Servings</span>
                          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50">
                            <Button
                              type="button"
                              text
                              icon="pi pi-chevron-left"
                              className="h-7 w-7"
                              aria-label="Decrease servings"
                              disabled={planned.servings <= minServings}
                              onClick={() => {
                                const nextServings = Math.max(minServings, planned.servings - 1);
                                if (nextServings === planned.servings) {
                                  return;
                                }
                                void updateServings.mutateAsync({
                                  date: day.dateString,
                                  servings: nextServings
                                });
                              }}
                            />
                            <span className="w-7 text-center text-sm font-semibold text-slate-700">
                              {planned.servings}
                            </span>
                            <Button
                              type="button"
                              text
                              icon="pi pi-chevron-right"
                              className="h-7 w-7"
                              aria-label="Increase servings"
                              disabled={planned.servings >= maxServings}
                              onClick={() => {
                                const nextServings = Math.min(maxServings, planned.servings + 1);
                                if (nextServings === planned.servings) {
                                  return;
                                }
                                void updateServings.mutateAsync({
                                  date: day.dateString,
                                  servings: nextServings
                                });
                              }}
                            />
                          </div>
                        </div>
                      <div className="mt-2 flex items-center justify-end gap-1">
                        {day.dateString <= todayDateString && (
                          <Button
                            size="small"
                            icon="pi pi-check"
                            severity={planned.consumedAt ? 'success' : undefined}
                            outlined={!planned.consumedAt}
                            text
                            rounded
                            aria-label={planned.consumedAt ? 'Eaten' : 'Mark Eaten'}
                            disabled={Boolean(planned.consumedAt)}
                            loading={consumeMealForDay.isPending}
                            onClick={async () => {
                              await consumeMealForDay.mutateAsync({ date: day.dateString });
                            }}
                          />
                        )}
                        <Button
                          size="small"
                          text
                          rounded
                          severity="danger"
                          icon="pi pi-trash"
                          aria-label="Clear Day"
                          loading={removeMealFromDay.isPending}
                          onClick={async () => {
                            await removeMealFromDay.mutateAsync({ date: day.dateString });
                          }}
                        />
                      </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Drop a meal here</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        ))}

        {activeTab === 'shopping' && (
          <Card className="h-full shopping-list-card">
            <div className="flex h-full min-h-0 flex-col">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
                <label htmlFor="includeInventory" className="flex items-center gap-2 text-sm text-slate-700">
                  <InputSwitch
                    inputId="includeInventory"
                    checked={includeInventory}
                    onChange={(event) => setIncludeInventory(Boolean(event.value))}
                  />
                  <span>Use inventory</span>
                </label>
                <div className="flex flex-wrap justify-end gap-4">
                <button
                  type="button"
                  className="text-sm font-medium text-red-600 underline underline-offset-2 hover:text-red-700"
                  onClick={async () => {
                    await clearAdditionalItems.mutateAsync();
                  }}
                >
                  Clear Additional Items
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                  onClick={() => {
                    void downloadShoppingListPdf();
                  }}
                >
                  Download PDF
                </button>
                </div>
              </div>

              <div ref={shoppingScrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Auto-generated from meals</h4>
                <div className="space-y-2">
                  {!shoppingList?.autoItems.length && (
                    <p className="text-sm text-slate-500">No generated items yet. Plan meals to generate a list.</p>
                  )}
                  {shoppingList?.autoItems.map((item) => (
                    <div key={`${item.ingredient}-${item.unit}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <div>
                        <div className="font-medium text-slate-800">{item.ingredient}</div>
                        <div className="text-xs text-slate-600">
                          {item.quantity ? `Total: ${item.quantity}` : `Used in ${item.occurrences} meal(s)`}
                          {item.unit ? ` ${item.unit}` : ''}
                        </div>
                      </div>
                      <Button
                        icon="pi pi-check"
                        text
                        severity="success"
                        aria-label={`Add ${item.ingredient} to inventory`}
                        loading={receiveInventoryItem.isPending}
                        onClick={async () => {
                          await receiveInventoryItem.mutateAsync({
                            name: item.ingredient,
                            quantity: item.quantity ?? undefined,
                            unit: item.unit ?? undefined
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Additional items</h4>
                </div>

                <div className="space-y-2">
                  {!shoppingList?.additionalItems.length && (
                    <p className="text-sm text-slate-500">No additional items for this week.</p>
                  )}
                  {shoppingList?.additionalItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <div>
                        <div className="font-medium text-slate-800">{item.ingredient}</div>
                        <div className="text-xs text-slate-600">
                          {item.quantity ? item.quantity : 'No quantity'}
                          {item.unit ? ` ${item.unit}` : ''}
                        </div>
                      </div>
                      <Button
                        icon="pi pi-check"
                        text
                        severity="success"
                        aria-label={`Add ${item.ingredient} to inventory`}
                        loading={receiveInventoryItem.isPending}
                        onClick={async () => {
                          await receiveInventoryItem.mutateAsync({
                            name: item.ingredient,
                            quantity: item.quantity ?? undefined,
                            unit: item.unit ?? undefined
                          });
                        }}
                      />
                      <Button
                        icon="pi pi-trash"
                        text
                        severity="danger"
                        aria-label={`Remove ${item.ingredient}`}
                        onClick={async () => {
                          await deleteAdditionalItem.mutateAsync(item.id);
                        }}
                        loading={deleteAdditionalItem.isPending}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Divider />

            <div className="space-y-3">
              <form
                className="grid gap-2 md:grid-cols-[1fr_120px_120px_auto]"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const ingredient = additionalItemName.trim();
                  if (!ingredient) {
                    return;
                  }
                  shouldScrollShoppingToBottom.current = true;
                  await createAdditionalItem.mutateAsync({
                    ingredient,
                    quantity: additionalItemQty.trim() || undefined,
                    unit: additionalItemUnit.trim() || undefined
                  });
                  setAdditionalItemName('');
                  setAdditionalItemQty('1');
                  setAdditionalItemUnit('');
                }}
              >
                <InputText
                  value={additionalItemName}
                  onChange={(event) => setAdditionalItemName(event.target.value)}
                  placeholder="Item name"
                />
                <Dropdown
                  value={additionalItemQty}
                  options={quantityOptions}
                  onChange={(event) => setAdditionalItemQty(String(event.value))}
                  placeholder="Qty"
                />
                <InputText
                  value={additionalItemUnit}
                  onChange={(event) => setAdditionalItemUnit(event.target.value)}
                  placeholder="Unit"
                />
                <Button
                  icon="pi pi-plus"
                  label="Add"
                  type="submit"
                  loading={createAdditionalItem.isPending}
                />
              </form>

              </div>
            </div>
          </Card>
        )}
      </div>

      <MealModal
        visible={isCreateModalOpen}
        onHide={() => setIsCreateModalOpen(false)}
        loading={createMeal.isPending}
        onSubmit={async (values) => {
          await createMeal.mutateAsync(values);
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
};
