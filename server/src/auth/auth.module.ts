import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { InspectorsModule } from '../inspectors/inspectors.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { Inspector } from '../inspectors/inspector.entity';

@Module({
  imports: [
    forwardRef(() => InspectorsModule),
    TypeOrmModule.forFeature([Session, Inspector]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
