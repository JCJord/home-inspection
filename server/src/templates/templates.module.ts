import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from './template.entity';
import { Inspection } from 'src/inspections/inspection.entity';
import { TemplatesService } from './templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Template, Inspection]),
  ],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule { }
