import { IsInt, Max, Min } from 'class-validator';

export class UpdateServingsDto {
  @IsInt()
  @Min(1)
  @Max(5)
  servings!: number;
}
