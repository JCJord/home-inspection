import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FindingsService } from './findings.service';
import { FindingsController } from './findings.controller';
import { Finding } from './finding.entity';
import { Inspection } from '../inspections/inspection.entity';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Finding, Inspection]),
    AuthModule,
    StorageModule,
  ],
  controllers: [FindingsController],
  providers: [FindingsService],
  exports: [FindingsService],
})
export class FindingsModule {}
