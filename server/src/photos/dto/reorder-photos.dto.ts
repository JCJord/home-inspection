import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PhotoOrderDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  sort_order: number;
}

export class ReorderPhotosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoOrderDto)
  photos: PhotoOrderDto[];
}
