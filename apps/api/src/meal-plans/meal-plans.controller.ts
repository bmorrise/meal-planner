import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import { CreateAdditionalShoppingItemDto } from './dto/create-additional-shopping-item.dto';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { MealPlansService } from './meal-plans.service';
import { UpdateServingsDto } from './dto/update-servings.dto';

@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  @Get()
  getWeekPlan(@Query('startDate') startDate: string) {
    return this.mealPlansService.getWeekPlan(startDate);
  }

  @Post()
  assignMeal(@Body() dto: CreateMealPlanDto) {
    return this.mealPlansService.assignMeal(dto);
  }

  @Put(':date/servings')
  updateServings(@Param('date') date: string, @Body() dto: UpdateServingsDto) {
    return this.mealPlansService.updateServingsForDay(date, dto.servings);
  }

  @Post(':date/consume')
  consumeMeal(@Param('date') date: string) {
    return this.mealPlansService.consumeMealForDay(date);
  }

  @Get('shopping-list')
  getShoppingList(@Query('startDate') startDate: string, @Query('includeInventory') includeInventory?: string) {
    return this.mealPlansService.getShoppingList(startDate, includeInventory !== 'false');
  }

  @Get('shopping-list/pdf')
  async downloadShoppingListPdf(
    @Query('startDate') startDate: string,
    @Query('includeInventory') includeInventory: string | undefined,
    @Res() res: any
  ) {
    const pdfBuffer = await this.mealPlansService.generateShoppingListPdf(startDate, includeInventory !== 'false');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="shopping-list-${startDate}.pdf"`);
    res.send(pdfBuffer);
  }

  @Post('shopping-list/additional-items')
  createAdditionalShoppingItem(@Body() dto: CreateAdditionalShoppingItemDto) {
    return this.mealPlansService.createAdditionalShoppingItem(dto);
  }

  @Delete('shopping-list/additional-items/:id')
  deleteAdditionalShoppingItem(@Param('id') id: string) {
    return this.mealPlansService.deleteAdditionalShoppingItem(id);
  }

  @Delete('shopping-list/additional-items')
  clearAdditionalShoppingItems(@Query('startDate') startDate: string) {
    return this.mealPlansService.clearAdditionalShoppingItems(startDate);
  }

  @Delete(':date')
  removeMealFromDay(@Param('date') date: string) {
    return this.mealPlansService.removeMealFromDay(date);
  }
}
