import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PdfService } from './pdf.service';
import { AuthModule } from '../auth/auth.module';
import { Inspection } from '../inspections/inspection.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Inspection]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, PdfService],
  exports: [ReportsService, PdfService],
})
export class ReportsModule {}

