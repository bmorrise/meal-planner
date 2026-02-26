import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Meal } from '../../types/domain';

const mealSchema = z.object({
  name: z.string().min(2, 'Meal name is required'),
  notes: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1, 'Ingredient name is required'),
        quantity: z.string().optional(),
        unit: z.string().optional()
      })
    )
    .min(1, 'Add at least one ingredient')
});

type MealFormValues = z.infer<typeof mealSchema>;

interface MealModalProps {
  visible: boolean;
  meal?: Meal;
  onHide: () => void;
  onSubmit: (values: MealFormValues) => Promise<void>;
  loading?: boolean;
}

export const MealModal = ({ visible, meal, onHide, onSubmit, loading }: MealModalProps) => {
  const quantityOptions = Array.from({ length: 10 }, (_, index) => {
    const value = String(index + 1);
    return { label: value, value };
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<MealFormValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      name: '',
      notes: '',
      ingredients: [{ name: '', quantity: '1', unit: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ingredients'
  });

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (meal) {
      reset({
        name: meal.name,
        notes: meal.notes ?? '',
        ingredients:
          meal.ingredients.length > 0
            ? meal.ingredients.map((ingredient) => ({
                name: ingredient.name,
                quantity: ingredient.quantity ?? '1',
                unit: ingredient.unit ?? ''
              }))
            : [{ name: '', quantity: '1', unit: '' }]
      });
      return;
    }

    reset({
      name: '',
      notes: '',
      ingredients: [{ name: '', quantity: '1', unit: '' }]
    });
  }, [meal, reset, visible]);

  return (
    <Dialog
      header={meal ? 'Edit Meal' : 'Add Meal'}
      visible={visible}
      onHide={onHide}
      className="w-[90vw] max-w-2xl"
      draggable={false}
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <InputText id="name" className="w-full" {...register('name')} />
          {errors.name && <small className="text-red-600">{errors.name.message}</small>}
        </div>

        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <InputTextarea id="notes" className="w-full" rows={3} {...register('notes')} />
        </div>

        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Ingredients</h3>
            <Button
              type="button"
              label="Add Ingredient"
              icon="pi pi-plus"
              outlined
              size="small"
              onClick={() => append({ name: '', quantity: '1', unit: '' })}
            />
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-lg bg-white p-3 md:grid-cols-[1fr_120px_120px_auto]">
                <InputText placeholder="Ingredient" {...register(`ingredients.${index}.name`)} />
                <Controller
                  control={control}
                  name={`ingredients.${index}.quantity`}
                  render={({ field: quantityField }) => (
                    <Dropdown
                      options={quantityOptions}
                      value={quantityField.value ?? '1'}
                      onChange={(event) => quantityField.onChange(String(event.value))}
                      className="w-full"
                    />
                  )}
                />
                <InputText placeholder="Unit" {...register(`ingredients.${index}.unit`)} />
                <Button
                  type="button"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                />
              </div>
            ))}
          </div>
          {errors.ingredients && <small className="text-red-600">{errors.ingredients.message}</small>}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" label="Cancel" outlined onClick={onHide} />
          <Button type="submit" label={meal ? 'Save Changes' : 'Create Meal'} loading={loading} />
        </div>
      </form>
    </Dialog>
  );
};
