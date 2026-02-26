import { Controller, Post } from '@nestjs/common';
import { MealSuggestionResponse, MealSuggestionsService } from './meal-suggestions.service';

@Controller('meal-suggestions')
export class MealSuggestionsController {
  constructor(private readonly mealSuggestionsService: MealSuggestionsService) {}

  @Post('suggest')
  suggestRecipe(): Promise<MealSuggestionResponse> {
    return this.mealSuggestionsService.suggestRecipe();
  }
}
