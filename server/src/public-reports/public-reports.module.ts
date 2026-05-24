import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicReportsService } from './public-reports.service';
import { PublicReportsController } from './public-reports.controller';
import { Inspection } from '../inspections/inspection.entity';
import { StorageModule } from 'src/common/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Inspection]), StorageModule],
  controllers: [PublicReportsController],
  providers: [PublicReportsService],
})
export class PublicReportsModule {}
