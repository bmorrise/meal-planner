import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InventoryModule } from './inventory/inventory.module';
import { MealSuggestionsModule } from './meal-suggestions/meal-suggestions.module';
import { MealsModule } from './meals/meals.module';
import { PrismaModule } from './prisma/prisma.module';
import { MealPlansModule } from './meal-plans/meal-plans.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MealsModule,
    MealPlansModule,
    InventoryModule,
    MealSuggestionsModule
  ]
})
export class AppModule {}
