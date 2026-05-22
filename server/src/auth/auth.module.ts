import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { InspectorsModule } from '../inspectors/inspectors.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { Inspector } from '../inspectors/inspector.entity';
import { InviteCode } from './invite-code.entity';
import { InviteCodeService } from './invite-code.service';
import { AdminInviteCodeController } from './admin-invite-code.controller';

@Module({
  imports: [
    forwardRef(() => InspectorsModule),
    TypeOrmModule.forFeature([Session, Inspector, InviteCode]),
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
  controllers: [AuthController, AdminInviteCodeController],
  providers: [AuthService, InviteCodeService],
  exports: [AuthService, JwtModule, InviteCodeService],
})
export class AuthModule {}
