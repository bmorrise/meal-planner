import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getItems() {
    return this.inventoryService.getItems();
  }

  @Post()
  createItem(@Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.createItem(dto);
  }

  @Post('receive')
  receiveItem(@Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.receiveItem(dto);
  }

  @Delete(':id')
  deleteItem(@Param('id') id: string) {
    return this.inventoryService.deleteItem(id);
  }
}
