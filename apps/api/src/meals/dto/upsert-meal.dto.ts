import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class IngredientInputDto {
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

export class UpsertMealDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngredientInputDto)
  ingredients!: IngredientInputDto[];
}
