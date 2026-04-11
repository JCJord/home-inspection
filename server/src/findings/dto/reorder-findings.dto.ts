import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindingOrderDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  sort_order: number;
}

export class ReorderFindingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FindingOrderDto)
  findings: FindingOrderDto[];
}
