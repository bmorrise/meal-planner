import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMealDto } from './dto/upsert-meal.dto';

@Injectable()
export class MealsService {
  constructor(private readonly prisma: PrismaService) {}

  getMeals() {
    return this.prisma.meal.findMany({
      orderBy: [{ lastSelectedAt: 'asc' }, { updatedAt: 'desc' }],
      include: {
        ingredients: true,
        mealPlans: {
          select: { date: true },
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    }).then((meals) =>
      meals.map(({ mealPlans, ...meal }) => ({
        ...meal,
        lastPlannedAt: mealPlans[0]?.date ?? null
      }))
    );
  }

  createMeal(dto: UpsertMealDto) {
    return this.prisma.meal.create({
      data: this.toMealCreateInput(dto),
      include: {
        ingredients: true
      }
    });
  }

  async updateMeal(id: string, dto: UpsertMealDto) {
    await this.prisma.ingredient.deleteMany({ where: { mealId: id } });

    return this.prisma.meal.update({
      where: { id },
      data: {
        name: dto.name,
        notes: dto.notes,
        ingredients: {
          create: dto.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit
          }))
        }
      },
      include: {
        ingredients: true
      }
    });
  }

  deleteMeal(id: string) {
    return this.prisma.meal.delete({
      where: { id }
    });
  }

  private toMealCreateInput(dto: UpsertMealDto): Prisma.MealCreateInput {
    return {
      name: dto.name,
      notes: dto.notes,
      ingredients: {
        create: dto.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit
        }))
      }
    };
  }
}
