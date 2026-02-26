import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdditionalShoppingItemDto } from './dto/create-additional-shopping-item.dto';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';

const pad = (value: number) => String(value).padStart(2, '0');

@Injectable()
export class MealPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeekPlan(startDate: string) {
    const { start, end } = this.weekRange(startDate);

    const entries = await this.prisma.mealPlanEntry.findMany({
      where: {
        date: {
          gte: start,
          lt: end
        }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        meal: {
          include: {
            ingredients: true
          }
        }
      }
    });

    return this
      .dedupeByCalendarDay(entries)
      .sort((left, right) => left.date.getTime() - right.date.getTime())
      .map((entry) => ({
        ...entry,
        date: this.toDateOnly(entry.date)
      }));
  }

  async assignMeal(dto: CreateMealPlanDto) {
    const dayStart = this.toUtcDayStart(dto.date);
    const dayEnd = this.addUtcDays(dayStart, 1);
    const canonicalDate = this.toUtcDayCanonical(dto.date);
    const servings = dto.servings ?? 1;

    const sameDayEntries = await this.prisma.mealPlanEntry.findMany({
      where: {
        date: {
          gte: dayStart,
          lt: dayEnd
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    let entry;
    if (sameDayEntries.length === 0) {
      entry = await this.prisma.mealPlanEntry.create({
        data: {
          date: canonicalDate,
          servings,
          mealId: dto.mealId
        },
        include: {
          meal: {
            include: {
              ingredients: true
            }
          }
        }
      });
    } else {
      const [winner, ...duplicates] = sameDayEntries;
      entry = await this.prisma.mealPlanEntry.update({
        where: { id: winner.id },
        data: {
          mealId: dto.mealId,
          date: canonicalDate,
          servings,
          consumedAt: null
        },
        include: {
          meal: {
            include: {
              ingredients: true
            }
          }
        }
      });

      if (duplicates.length > 0) {
        await this.prisma.mealPlanEntry.deleteMany({
          where: {
            id: { in: duplicates.map((item) => item.id) }
          }
        });
      }
    }

    const latestEntry = await this.prisma.mealPlanEntry.findFirst({
      where: { mealId: dto.mealId },
      orderBy: { date: 'desc' },
      select: { date: true }
    });

    await this.prisma.meal.update({
      where: { id: dto.mealId },
      data: {
        lastSelectedAt: latestEntry?.date ?? null
      }
    });

    return {
      ...entry,
      date: this.toDateOnly(entry.date)
    };
  }

  async updateServingsForDay(date: string, servings: number) {
    const dayStart = this.toUtcDayStart(date);
    const dayEnd = this.addUtcDays(dayStart, 1);
    const canonicalDate = this.toUtcDayCanonical(date);

    const sameDayEntries = await this.prisma.mealPlanEntry.findMany({
      where: {
        date: {
          gte: dayStart,
          lt: dayEnd
        }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        meal: {
          include: {
            ingredients: true
          }
        }
      }
    });

    if (sameDayEntries.length === 0) {
      throw new BadRequestException('No meal planned for this day.');
    }

    const [winner, ...duplicates] = sameDayEntries;
    const updated = await this.prisma.mealPlanEntry.update({
      where: { id: winner.id },
      data: {
        servings,
        date: canonicalDate
      },
      include: {
        meal: {
          include: {
            ingredients: true
          }
        }
      }
    });

    if (duplicates.length > 0) {
      await this.prisma.mealPlanEntry.deleteMany({
        where: {
          id: { in: duplicates.map((entry) => entry.id) }
        }
      });
    }

    return {
      ...updated,
      date: this.toDateOnly(updated.date)
    };
  }

  async getShoppingList(startDate: string, includeInventory = true) {
    const { start, end } = this.weekRange(startDate);

    const [entries, additionalItems, inventoryItems] = await Promise.all([
      this.prisma.mealPlanEntry.findMany({
        where: {
          date: {
            gte: start,
            lt: end
          }
        },
        include: {
          meal: {
            include: {
              ingredients: true
            }
          }
        }
      }),
      this.prisma.additionalShoppingItem.findMany({
        where: { weekStart: this.toUtcDayStart(startDate) },
        orderBy: { createdAt: 'asc' }
      }),
      includeInventory
        ? this.prisma.inventoryItem.findMany({
            select: { name: true, unit: true, quantity: true }
          })
        : Promise.resolve([])
    ]);

    const dedupedEntries = this.dedupeByCalendarDay(entries);
    const aggregate = new Map<string, { ingredient: string; unit?: string; quantityTotal: number | null; quantityText?: string; occurrences: number }>();

    for (const entry of dedupedEntries) {
      for (const ingredient of entry.meal.ingredients) {
        const key = `${ingredient.name.toLowerCase()}::${ingredient.unit ?? ''}`;
        const current = aggregate.get(key);
        const servings = Math.max(1, entry.servings ?? 1);
        const parsedQty = ingredient.quantity ? Number(ingredient.quantity) : Number.NaN;

        if (!current) {
          aggregate.set(key, {
            ingredient: ingredient.name,
            unit: ingredient.unit ?? undefined,
            quantityTotal: Number.isFinite(parsedQty) ? parsedQty * servings : null,
            quantityText: Number.isFinite(parsedQty) ? undefined : ingredient.quantity ?? undefined,
            occurrences: servings
          });
          continue;
        }

        current.occurrences += servings;

        if (Number.isFinite(parsedQty) && current.quantityTotal !== null) {
          current.quantityTotal += parsedQty * servings;
        } else {
          current.quantityTotal = null;
          current.quantityText = current.quantityText ?? ingredient.quantity ?? undefined;
        }
      }
    }

    const autoItems = Array.from(aggregate.values())
      .map((item) => ({
        ingredient: item.ingredient,
        unit: item.unit,
        quantity: item.quantityTotal !== null ? String(item.quantityTotal) : item.quantityText,
        occurrences: item.occurrences
      }));

    if (!includeInventory) {
      return {
        autoItems,
        additionalItems
      };
    }

    const inventoryByKey = new Map<string, number>();
    for (const inventoryItem of inventoryItems) {
      const key = `${inventoryItem.name.trim().toLowerCase()}::${inventoryItem.unit?.trim().toLowerCase() ?? ''}`;
      const qty = Number(inventoryItem.quantity);
      if (!Number.isFinite(qty)) {
        continue;
      }
      inventoryByKey.set(key, (inventoryByKey.get(key) ?? 0) + qty);
    }

    const adjustedAutoItems = autoItems
      .map((item) => {
        const key = `${item.ingredient.trim().toLowerCase()}::${item.unit?.trim().toLowerCase() ?? ''}`;
        const inventoryQty = inventoryByKey.get(key) ?? 0;
        const requiredQty = Number(item.quantity);

        if (Number.isFinite(requiredQty)) {
          const remaining = requiredQty - inventoryQty;
          if (remaining <= 0) {
            return null;
          }

          return {
            ...item,
            quantity: Number.isInteger(remaining) ? String(remaining) : String(Number(remaining.toFixed(2)))
          };
        }

        if (inventoryQty > 0) {
          return null;
        }

        return item;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      autoItems: adjustedAutoItems,
      additionalItems
    };
  }

  createAdditionalShoppingItem(dto: CreateAdditionalShoppingItemDto) {
    return this.prisma.additionalShoppingItem.create({
      data: {
        weekStart: this.toUtcDayStart(dto.startDate),
        ingredient: dto.ingredient,
        quantity: dto.quantity,
        unit: dto.unit
      }
    });
  }

  async deleteAdditionalShoppingItem(id: string) {
    await this.prisma.additionalShoppingItem.delete({
      where: { id }
    });
    return { deleted: true };
  }

  async clearAdditionalShoppingItems(startDate: string) {
    const result = await this.prisma.additionalShoppingItem.deleteMany({
      where: {
        weekStart: this.toUtcDayStart(startDate)
      }
    });
    return { deletedCount: result.count };
  }

  async generateShoppingListPdf(startDate: string, includeInventory = true) {
    const shoppingList = await this.getShoppingList(startDate, includeInventory);
    const endDate = this.toDateOnly(this.addUtcDays(this.toUtcDayStart(startDate), 6));

    const React = await import('react');
    const ReactPdf = (await import('@react-pdf/renderer')) as any;
    const { renderToBuffer, Document, Page, Text, View, StyleSheet } = ReactPdf;

    const styles = StyleSheet.create({
      page: { padding: 24, fontSize: 11, color: '#111827' },
      title: { fontSize: 20, marginBottom: 4 },
      subtitle: { fontSize: 11, marginBottom: 12, color: '#6b7280' },
      sectionTitle: { fontSize: 13, marginTop: 10, marginBottom: 6 },
      tableHeader: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#f3f4f6'
      },
      row: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: '#d1d5db' },
      cell: { padding: 6, fontSize: 10 },
      colItem: { width: '45%' },
      colQty: { width: '20%' },
      colUnit: { width: '20%' },
      colOcc: { width: '15%' },
      empty: { borderWidth: 1, borderTopWidth: 0, borderColor: '#d1d5db', padding: 6, fontSize: 10, color: '#6b7280' }
    });

    const rows = [
      ...shoppingList.autoItems.map((item: any, index: number) =>
        React.createElement(
          View,
          { key: `auto-${index}`, style: styles.row },
          React.createElement(Text, { style: [styles.cell, styles.colItem] }, item.ingredient),
          React.createElement(Text, { style: [styles.cell, styles.colQty] }, item.quantity ?? ''),
          React.createElement(Text, { style: [styles.cell, styles.colUnit] }, item.unit ?? ''),
          React.createElement(Text, { style: [styles.cell, styles.colOcc] }, item.occurrences ? `Used ${item.occurrences}x` : '')
        )
      ),
      ...shoppingList.additionalItems.map((item: any) =>
        React.createElement(
          View,
          { key: item.id, style: styles.row },
          React.createElement(Text, { style: [styles.cell, styles.colItem] }, item.ingredient),
          React.createElement(Text, { style: [styles.cell, styles.colQty] }, item.quantity ?? ''),
          React.createElement(Text, { style: [styles.cell, styles.colUnit] }, item.unit ?? ''),
          React.createElement(Text, { style: [styles.cell, styles.colOcc] }, '')
        )
      )
    ];

    const mergedRows =
      rows.length > 0
        ? rows
        : [React.createElement(Text, { key: 'empty', style: styles.empty }, 'No items for this week.')];

    const document = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: 'A4', style: styles.page },
        React.createElement(Text, { style: styles.title }, 'Weekly Shopping List'),
        React.createElement(Text, { style: styles.subtitle }, `${startDate} - ${endDate}`),
        React.createElement(Text, { style: styles.sectionTitle }, 'Shopping list'),
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: [styles.cell, styles.colItem] }, 'Item'),
          React.createElement(Text, { style: [styles.cell, styles.colQty] }, 'Quantity'),
          React.createElement(Text, { style: [styles.cell, styles.colUnit] }, 'Unit'),
          React.createElement(Text, { style: [styles.cell, styles.colOcc] }, 'Notes')
        ),
        ...mergedRows
      )
    );

    return await renderToBuffer(document);
  }

  async removeMealFromDay(date: string) {
    const dayStart = this.toUtcDayStart(date);
    const dayEnd = this.addUtcDays(dayStart, 1);

    const sameDayEntries = await this.prisma.mealPlanEntry.findMany({
      where: {
        date: {
          gte: dayStart,
          lt: dayEnd
        }
      },
      select: { id: true, mealId: true }
    });

    if (sameDayEntries.length === 0) {
      return { deletedCount: 0 };
    }

    const impactedMealIds = Array.from(new Set(sameDayEntries.map((entry) => entry.mealId)));

    const result = await this.prisma.mealPlanEntry.deleteMany({
      where: {
        id: { in: sameDayEntries.map((entry) => entry.id) }
      }
    });

    for (const mealId of impactedMealIds) {
      const latestEntry = await this.prisma.mealPlanEntry.findFirst({
        where: { mealId },
        orderBy: { date: 'desc' },
        select: { date: true }
      });

      await this.prisma.meal.update({
        where: { id: mealId },
        data: { lastSelectedAt: latestEntry?.date ?? null }
      });
    }

    return { deletedCount: result.count };
  }

  async consumeMealForDay(date: string) {
    const dayStart = this.toUtcDayStart(date);
    const dayEnd = this.addUtcDays(dayStart, 1);

    const consumedEntry = await this.prisma.$transaction(async (tx) => {
      const entries = await tx.mealPlanEntry.findMany({
        where: {
          date: {
            gte: dayStart,
            lt: dayEnd
          }
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          meal: {
            include: {
              ingredients: true
            }
          }
        }
      });

      if (entries.length === 0) {
        throw new BadRequestException('No meal planned for this day.');
      }

      const [winner, ...duplicates] = entries;
      if (winner.consumedAt) {
        return winner;
      }

      const servings = Math.max(1, winner.servings ?? 1);
      for (const ingredient of winner.meal.ingredients) {
        const requiredPerServing = Number(ingredient.quantity);
        if (!Number.isFinite(requiredPerServing) || requiredPerServing <= 0) {
          continue;
        }

        let remaining = requiredPerServing * servings;
        if (remaining <= 0) {
          continue;
        }

        const normalizedName = ingredient.name.trim();
        const normalizedUnit = ingredient.unit?.trim();

        const matchingInventory = await tx.inventoryItem.findMany({
          where: {
            name: { equals: normalizedName },
            ...(normalizedUnit
              ? { unit: { equals: normalizedUnit } }
              : {
                  OR: [{ unit: null }, { unit: '' }]
                })
          },
          orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }]
        });

        for (const inventoryItem of matchingInventory) {
          if (remaining <= 0) {
            break;
          }

          const available = Number(inventoryItem.quantity);
          if (!Number.isFinite(available) || available <= 0) {
            continue;
          }

          const used = Math.min(available, remaining);
          const nextQuantity = available - used;

          if (nextQuantity <= 0) {
            await tx.inventoryItem.delete({
              where: { id: inventoryItem.id }
            });
          } else {
            await tx.inventoryItem.update({
              where: { id: inventoryItem.id },
              data: {
                quantity: this.formatNumericQuantity(nextQuantity)
              }
            });
          }

          remaining -= used;
        }
      }

      const updated = await tx.mealPlanEntry.update({
        where: { id: winner.id },
        data: { consumedAt: new Date() },
        include: {
          meal: {
            include: {
              ingredients: true
            }
          }
        }
      });

      if (duplicates.length > 0) {
        await tx.mealPlanEntry.deleteMany({
          where: {
            id: { in: duplicates.map((entry) => entry.id) }
          }
        });
      }

      return updated;
    });

    return {
      ...consumedEntry,
      date: this.toDateOnly(consumedEntry.date)
    };
  }

  private weekRange(startDate: string) {
    const start = this.toUtcDayStart(startDate);
    const end = this.addUtcDays(start, 7);
    return { start, end };
  }

  private parseDateOnly(raw: string) {
    this.assertDateOnly(raw);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return { year, month, day };
  }

  private assertDateOnly(raw: string) {
    if (!raw) {
      throw new BadRequestException('startDate is required (YYYY-MM-DD).');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }
  }

  private toUtcDayStart(raw: string) {
    const { year, month, day } = this.parseDateOnly(raw);
    const parsed = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }
    return parsed;
  }

  private toUtcDayCanonical(raw: string) {
    const { year, month, day } = this.parseDateOnly(raw);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }
    return parsed;
  }

  private addUtcDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private toDateOnly(value: Date) {
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }

  private dedupeByCalendarDay<T extends { date: Date }>(entries: T[]) {
    const deduped = new Map<string, T>();
    for (const entry of entries) {
      const key = this.toDateOnly(entry.date);
      if (!deduped.has(key)) {
        deduped.set(key, entry);
      }
    }
    return Array.from(deduped.values());
  }

  private formatNumericQuantity(value: number) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  }
}
