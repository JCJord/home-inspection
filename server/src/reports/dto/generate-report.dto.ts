import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  @IsNotEmpty()
  html: string;
}
