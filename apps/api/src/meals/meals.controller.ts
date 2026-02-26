import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UpsertMealDto } from './dto/upsert-meal.dto';
import { MealsService } from './meals.service';

@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Get()
  getMeals() {
    return this.mealsService.getMeals();
  }

  @Post()
  createMeal(@Body() dto: UpsertMealDto) {
    return this.mealsService.createMeal(dto);
  }

  @Put(':id')
  updateMeal(@Param('id') id: string, @Body() dto: UpsertMealDto) {
    return this.mealsService.updateMeal(id, dto);
  }

  @Delete(':id')
  deleteMeal(@Param('id') id: string) {
    return this.mealsService.deleteMeal(id);
  }
}
