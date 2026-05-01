import {
  IsString,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsNumber,
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

  @IsOptional()
  @IsEmail()
  client_email?: string;

  @IsOptional()
  @IsString()
  client_phone?: string;

  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  year_built: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99999)
  square_footage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  weather?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupancy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attendees?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  foundation_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cover_photo_url?: string;

  @IsOptional()
  @IsString()
  template_id?: string;

  @IsOptional()
  metadata_values?: Record<string, string>;
}
