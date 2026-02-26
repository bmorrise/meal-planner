import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useMemo, useState } from 'react';
import { useCreateMeal, useDeleteMeal, useMeals, useUpdateMeal } from '../../api/meals';
import { Meal } from '../../types/domain';
import { MealModal } from './MealModal';

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Never';
  }
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const MealsPage = () => {
  const { data: meals, isLoading } = useMeals();
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const deleteMeal = useDeleteMeal();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | undefined>();
  const [searchValue, setSearchValue] = useState('');

  const filteredMeals = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    if (!search) {
      return meals ?? [];
    }

    return (meals ?? []).filter((meal) => {
      if (meal.name.toLowerCase().includes(search)) {
        return true;
      }
      if ((meal.notes ?? '').toLowerCase().includes(search)) {
        return true;
      }
      return meal.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(search));
    });
  }, [meals, searchValue]);

  const openCreate = () => {
    setSelectedMeal(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Meals</h2>
          <p className="text-sm text-slate-600">Track meals, ingredients, and when each meal was last eaten.</p>
        </div>
        <Button icon="pi pi-plus" label="Add Meal" onClick={openCreate} />
      </div>

      <div className="shrink-0 relative">
        <i className="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <InputText
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search meals, notes, or ingredients"
          className="w-full pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="5" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredMeals.map((meal) => (
              <Card
                key={meal.id}
                title={meal.name}
                subTitle={`Last eaten: ${formatDate(meal.lastSelectedAt ?? meal.lastPlannedAt)}`}
                className="border border-slate-100"
              >
                <p className="mb-3 text-sm text-slate-600">{meal.notes || 'No notes provided.'}</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {meal.ingredients.map((ingredient) => (
                    <span
                      key={ingredient.id}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                    >
                      {ingredient.quantity ? `${ingredient.quantity} ` : ''}
                      {ingredient.unit ? `${ingredient.unit} ` : ''}
                      {ingredient.name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => openEdit(meal)} />
                  <Button
                    label="Delete"
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    loading={deleteMeal.isPending}
                    onClick={async () => {
                      const confirmed = window.confirm(`Delete "${meal.name}"? This will remove it from meal plans.`);
                      if (!confirmed) {
                        return;
                      }
                      await deleteMeal.mutateAsync(meal.id);
                    }}
                  />
                </div>
              </Card>
            ))}
            {!filteredMeals.length && (
              <Card className="border border-slate-100 md:col-span-2">
                <p className="text-sm text-slate-600">No meals match your search.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      <MealModal
        visible={isModalOpen}
        meal={selectedMeal}
        onHide={() => setIsModalOpen(false)}
        loading={createMeal.isPending || updateMeal.isPending}
        onSubmit={async (values) => {
          if (selectedMeal) {
            await updateMeal.mutateAsync({ id: selectedMeal.id, ...values });
          } else {
            await createMeal.mutateAsync(values);
          }
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};
