import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsString()
  unit?: string;
}
