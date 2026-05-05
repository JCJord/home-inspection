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
  @IsString({ message: 'Property address must be a valid string' })
  @IsNotEmpty({ message: 'Property address is required' })
  @MaxLength(300, { message: 'Property address cannot exceed 300 characters' })
  address: string;

  @IsString({ message: 'Client name must be a valid string' })
  @IsNotEmpty({ message: 'Client name is required' })
  @MaxLength(100, { message: 'Client name cannot exceed 100 characters' })
  client_name: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  client_email?: string;

  @IsOptional()
  @IsString({ message: 'Client phone must be a valid string' })
  client_phone?: string;

  @IsInt({ message: 'Year built must be a whole number' })
  @Min(1800, { message: 'Year built must be after 1800' })
  @Max(new Date().getFullYear(), { message: 'Year built cannot be in the future' })
  year_built: number;

  @IsOptional()
  @IsInt({ message: 'Square footage must be a whole number' })
  @Min(1, { message: 'Square footage must be at least 1 sq ft' })
  @Max(99999, { message: 'Square footage cannot exceed 99,999 sq ft' })
  square_footage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  weather?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Temperature must be a valid number' })
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

  @IsOptional()
  section_statuses?: Record<string, any>;
}
