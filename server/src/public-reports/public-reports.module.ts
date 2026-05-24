import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicReportsService } from './public-reports.service';
import { PublicReportsController } from './public-reports.controller';
import { Inspection } from '../inspections/inspection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Inspection])],
  controllers: [PublicReportsController],
  providers: [PublicReportsService],
})
export class PublicReportsModule {}
