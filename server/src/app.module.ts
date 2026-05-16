import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InspectorsModule } from './inspectors/inspectors.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { InspectionsModule } from './inspections/inspections.module';
import { FindingsModule } from './findings/findings.module';
import { PhotosModule } from './photos/photos.module';
import { AiModule } from './ai/ai.module';
import { ReportsModule } from './reports/reports.module';
import { TemplatesModule } from './templates/templates.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 300,
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    DatabaseModule,
    InspectorsModule,
    AuthModule,
    InspectionsModule,
    FindingsModule,
    PhotosModule,
    AiModule,
    ReportsModule,
    TemplatesModule,
    EventEmitterModule.forRoot(),
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
