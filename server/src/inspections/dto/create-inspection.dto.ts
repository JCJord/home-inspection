import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateInspectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  client_name: string;

  @IsEmail()
  client_email: string;

  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  year_built: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99999)
  square_footage?: number;
}
