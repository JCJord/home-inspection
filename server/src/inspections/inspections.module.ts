import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';
import { Inspection } from './inspection.entity';
import { Inspector } from '../inspectors/inspector.entity';
import { Report } from '../reports/report.entity';
import { Finding } from '../findings/finding.entity';
import { AuthModule } from '../auth/auth.module';
import { Template } from '../templates/template.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inspection, Inspector, Report, Finding, Template]),
    MulterModule.register(),
    AuthModule,
    ReportsModule,
  ],
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule { }
