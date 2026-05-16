import {
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf
} from 'class-validator';
import { BrandFont } from '../../common/enums/brand-font.enum';
import { SOPType } from '../../common/enums/sop.enum';

export class UpdateProfileDto {

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  license_number?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  certifications?: string;

  @IsOptional()
  @IsHexColor()
  brand_primary_color?: string;

  @IsOptional()
  @IsEnum(BrandFont)
  brand_font_family?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  report_footer_text?: string;

  @IsOptional()
  @IsEnum(SOPType, { message: 'Invalid Standard of Practice provided.' })
  sop_name?: SOPType;

  @IsOptional()
  @IsString()
  @MaxLength(10000, { message: 'Legal disclaimer exceeds maximum length.' })
  custom_legal_disclaimer?: string;

  @IsOptional()
  @IsBoolean()
  use_standard_definitions?: boolean;

  @ValidateIf(o => o.use_standard_definitions === false)
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Custom safety hazard definition is too short.' })
  @MaxLength(1000)
  custom_safety_hazard_def?: string;

  @ValidateIf(o => o.use_standard_definitions === false)
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Custom major defect definition is too short.' })
  @MaxLength(1000)
  custom_major_defect_def?: string;

  @ValidateIf(o => o.use_standard_definitions === false)
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Custom minor defect definition is too short.' })
  @MaxLength(1000)
  custom_minor_defect_def?: string;

  @ValidateIf(o => o.use_standard_definitions === false)
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Custom maintenance item definition is too short.' })
  @MaxLength(1000)
  custom_maintenance_item_def?: string;

  @ValidateIf(o => o.use_standard_definitions === false)
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Custom informational item definition is too short.' })
  @MaxLength(1000)
  custom_informational_item_def?: string;

  @IsOptional()
  @IsBoolean()
  default_send_email_confirmation?: boolean;
}
