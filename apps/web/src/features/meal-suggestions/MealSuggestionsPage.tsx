import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useSuggestRecipe } from '../../api/mealSuggestions';
import { useCreateMeal } from '../../api/meals';
import { MealSuggestion } from '../../types/domain';

export const MealSuggestionsPage = () => {
  const suggestRecipe = useSuggestRecipe();
  const createMeal = useCreateMeal();
  const [suggestion, setSuggestion] = useState<MealSuggestion | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const toMealNotes = (recipe: MealSuggestion) => {
    const lines = [
      `Recipe: ${recipe.name}`,
      '',
      `Required: ${recipe.required.length ? recipe.required.join(', ') : 'None listed'}`,
      `Optional: ${recipe.optional.length ? recipe.optional.join(', ') : 'None listed'}`,
      '',
      'Ingredients:',
      ...recipe.ingredients.map((ingredient) => {
        const qty = ingredient.quantity ? `${ingredient.quantity} ` : '';
        const unit = ingredient.unit ? `${ingredient.unit} ` : '';
        return `- ${qty}${unit}${ingredient.name}`.trim();
      }),
      '',
      'Steps:',
      ...recipe.steps.map((step, index) => `${index + 1}. ${step}`)
    ];
    return lines.join('\n');
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0">
        <h2 className="text-2xl font-semibold text-slate-900">Meal Suggestions</h2>
        <p className="text-sm text-slate-600">
          Generate recipe suggestions from your inventory and add them directly to Meals.
        </p>
      </div>

      <div className="shrink-0">
        <Button
          label="Suggest Recipe"
          icon="pi pi-lightbulb"
          loading={suggestRecipe.isPending}
          onClick={async () => {
            try {
              const nextSuggestion = await suggestRecipe.mutateAsync();
              setSuggestion(nextSuggestion);
              setSuggestionError(null);
            } catch (error) {
              const message = isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message ?? 'Unable to generate a recipe suggestion right now.'
                : 'Unable to generate a recipe suggestion right now.';
              setSuggestion(null);
              setSuggestionError(message);
            }
          }}
        />
      </div>

      {suggestionError && (
        <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <div className="flex items-start gap-2">
            <i className="pi pi-exclamation-triangle mt-0.5" />
            <div>
              <p className="text-sm font-semibold">No Recipe Available</p>
              <p className="text-sm">{suggestionError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {!suggestion ? (
          <Card className="border border-slate-200">
            <p className="text-sm text-slate-600">Click Suggest Recipe to generate a recipe from your inventory.</p>
          </Card>
        ) : (
          <Card className="border border-slate-200">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{suggestion.name}</h3>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Ingredients</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestion.ingredients.map((ingredient) => (
                    <span
                      key={`${ingredient.name}-${ingredient.unit ?? ''}`}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                    >
                      {ingredient.quantity ? `${ingredient.quantity} ` : ''}
                      {ingredient.unit ? `${ingredient.unit} ` : ''}
                      {ingredient.name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Required</h4>
                <p className="text-sm text-slate-700">
                  {suggestion.required.length ? suggestion.required.join(', ') : 'None listed'}
                </p>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Optional</h4>
                <p className="text-sm text-slate-700">
                  {suggestion.optional.length ? suggestion.optional.join(', ') : 'None listed'}
                </p>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Steps</h4>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                  {suggestion.steps.map((step, index) => (
                    <li key={`${index}-${step}`}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="flex justify-end">
                <Button
                  label="Add to Meals"
                  icon="pi pi-check"
                  loading={createMeal.isPending}
                  onClick={async () => {
                    await createMeal.mutateAsync({
                      name: suggestion.name,
                      notes: toMealNotes(suggestion),
                      ingredients: suggestion.ingredients.map((ingredient) => ({
                        name: ingredient.name,
                        quantity: ingredient.quantity ?? undefined,
                        unit: ingredient.unit ?? undefined
                      }))
                    });
                  }}
                />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
