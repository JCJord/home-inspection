import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectorsService } from './inspectors.service';
import { InspectorsController } from './inspectors.controller';
import { Inspector } from './inspector.entity';
import { InspectorsRepository } from './inspectors.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Inspector])],
  controllers: [InspectorsController],
  providers: [InspectorsService, InspectorsRepository],
  exports: [InspectorsService, InspectorsRepository],
})
export class InspectorsModule {}


