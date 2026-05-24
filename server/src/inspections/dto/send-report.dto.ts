import { IsEmail } from 'class-validator';

export class SendReportDto {
  @IsEmail()
  email!: string;
}
