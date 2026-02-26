import { IsDateString, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateMealPlanDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  mealId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  servings?: number;
}
