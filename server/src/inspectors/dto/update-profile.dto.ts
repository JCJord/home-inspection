import { IsEmail, IsEnum, IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';
import { BrandFont } from '../../common/enums/brand-font.enum';

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
  @IsHexColor()
  brand_primary_color?: string;

  @IsOptional()
  @IsEnum(BrandFont)
  brand_font_family?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  report_footer_text?: string;
}
