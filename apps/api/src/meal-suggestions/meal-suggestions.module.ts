import { Module } from '@nestjs/common';
import { MealSuggestionsController } from './meal-suggestions.controller';
import { MealSuggestionsService } from './meal-suggestions.service';

@Module({
  controllers: [MealSuggestionsController],
  providers: [MealSuggestionsService]
})
export class MealSuggestionsModule {}
