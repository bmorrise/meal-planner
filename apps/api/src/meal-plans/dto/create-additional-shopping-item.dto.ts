import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdditionalShoppingItemDto {
  @IsString()
  @MinLength(10)
  startDate!: string;

  @IsString()
  @MinLength(1)
  ingredient!: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsString()
  unit?: string;
}
