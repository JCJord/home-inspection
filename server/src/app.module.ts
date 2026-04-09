import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InspectorsModule } from './inspectors/inspectors.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    InspectorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

