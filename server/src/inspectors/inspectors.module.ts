import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectorsService } from './inspectors.service';
import { InspectorsController } from './inspectors.controller';
import { Inspector } from './inspector.entity';
import { InspectorsRepository } from './inspectors.repository';

import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthModule } from '../auth/auth.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inspector]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
    forwardRef(() => AuthModule),
  ],
  controllers: [InspectorsController],
  providers: [InspectorsService, InspectorsRepository],
  exports: [InspectorsService, InspectorsRepository],
})
export class InspectorsModule {}


