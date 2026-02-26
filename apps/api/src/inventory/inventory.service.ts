import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  getItems() {
    return this.prisma.inventoryItem.findMany({
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
    });
  }

  createItem(dto: CreateInventoryItemDto) {
    return this.prisma.inventoryItem.create({
      data: {
        name: dto.name.trim(),
        quantity: dto.quantity?.trim() || null,
        unit: dto.unit?.trim() || null
      }
    });
  }

  async receiveItem(dto: CreateInventoryItemDto) {
    const name = dto.name.trim();
    const unit = dto.unit?.trim() || null;
    const quantity = dto.quantity?.trim() || null;
    const incomingQty = quantity ? Number(quantity) : Number.NaN;

    const existing = await this.prisma.inventoryItem.findFirst({
      where: {
        name: { equals: name },
        ...(unit
          ? { unit: { equals: unit } }
          : {
              OR: [{ unit: null }, { unit: '' }]
            })
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
    });

    if (!existing) {
      return this.prisma.inventoryItem.create({
        data: {
          name,
          quantity,
          unit
        }
      });
    }

    if (Number.isFinite(incomingQty)) {
      const existingQty = Number(existing.quantity);
      if (Number.isFinite(existingQty)) {
        return this.prisma.inventoryItem.update({
          where: { id: existing.id },
          data: {
            quantity: this.formatNumericQuantity(existingQty + incomingQty)
          }
        });
      }

      return this.prisma.inventoryItem.create({
        data: {
          name,
          quantity: this.formatNumericQuantity(incomingQty),
          unit
        }
      });
    }

    if (!quantity) {
      return existing;
    }

    return this.prisma.inventoryItem.create({
      data: {
        name,
        quantity,
        unit
      }
    });
  }

  deleteItem(id: string) {
    return this.prisma.inventoryItem.delete({
      where: { id }
    });
  }

  private formatNumericQuantity(value: number) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  }
}
