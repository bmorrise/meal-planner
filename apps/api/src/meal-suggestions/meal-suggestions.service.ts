import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MealSuggestionIngredient {
  name: string;
  quantity?: string | null;
  unit?: string | null;
}

export interface MealSuggestionResponse {
  name: string;
  required: string[];
  optional: string[];
  ingredients: MealSuggestionIngredient[];
  steps: string[];
}

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

interface SuggestionModelResponse {
  status?: 'ok' | 'insufficient';
  reason?: string;
  recipe?: unknown;
}

@Injectable()
export class MealSuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestRecipe(): Promise<MealSuggestionResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('OPENAI_API_KEY is not configured.');
    }

    const inventoryItems = await this.prisma.inventoryItem.findMany({
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
    });

    if (inventoryItems.length === 0) {
      throw new BadRequestException('Your inventory is empty. Add items to inventory before suggesting a recipe.');
    }

    const inventoryPayload = inventoryItems.map((item) => ({
      name: item.name,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null
    }));

    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a meal planning assistant. Return strict JSON only with one of these shapes: { "status": "ok", "recipe": { "name": string, "required": string[], "optional": string[], "ingredients": [{ "name": string, "quantity"?: string, "unit"?: string }], "steps": string[] } } OR { "status": "insufficient", "reason": string }. If inventory is not enough for a practical meal, return insufficient. Do not include markdown.'
          },
          {
            role: 'user',
            content: `Inventory:\n${JSON.stringify(
              inventoryPayload
            )}\n\nSuggest one practical recipe that uses as many inventory items as possible.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(`OpenAI request failed (${response.status}): ${errorText}`);
    }

    const raw = (await response.json()) as OpenAiChatCompletionResponse;
    const content = raw.choices?.[0]?.message?.content;
    if (!content) {
      throw new InternalServerErrorException('OpenAI returned an empty suggestion.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new InternalServerErrorException('OpenAI returned invalid JSON for recipe suggestion.');
    }

    const modelPayload = parsed as SuggestionModelResponse;
    if (modelPayload.status === 'insufficient') {
      const reason = typeof modelPayload.reason === 'string' && modelPayload.reason.trim()
        ? modelPayload.reason.trim()
        : 'Not enough compatible items in inventory to suggest a meal.';
      throw new BadRequestException(`Not enough ingredients to suggest a recipe. ${reason}`);
    }

    return this.validateSuggestion(modelPayload.recipe ?? parsed);
  }

  private validateSuggestion(value: unknown): MealSuggestionResponse {
    if (!value || typeof value !== 'object') {
      throw new InternalServerErrorException('Invalid recipe suggestion payload.');
    }

    const payload = value as Record<string, unknown>;
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) {
      throw new InternalServerErrorException('Recipe suggestion is missing a valid name.');
    }

    const required = this.toStringArray(payload.required);
    const optional = this.toStringArray(payload.optional);
    const steps = this.toStringArray(payload.steps);
    if (steps.length === 0) {
      throw new InternalServerErrorException('Recipe suggestion is missing steps.');
    }

    const ingredientsRaw = Array.isArray(payload.ingredients) ? payload.ingredients : [];
    const ingredients: MealSuggestionIngredient[] = [];
    for (const item of ingredientsRaw) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const ingredient = item as Record<string, unknown>;
      const ingredientName = typeof ingredient.name === 'string' ? ingredient.name.trim() : '';
      if (!ingredientName) {
        continue;
      }

      ingredients.push({
        name: ingredientName,
        quantity: typeof ingredient.quantity === 'string' ? ingredient.quantity.trim() || null : null,
        unit: typeof ingredient.unit === 'string' ? ingredient.unit.trim() || null : null
      });
    }

    if (ingredients.length === 0) {
      throw new InternalServerErrorException('Recipe suggestion is missing ingredients.');
    }

    return {
      name,
      required,
      optional,
      ingredients,
      steps
    };
  }

  private toStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
}
