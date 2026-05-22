import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminSecretGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminSecretHeader = request.headers['admin-secret'];
    
    if (!adminSecretHeader) {
      throw new UnauthorizedException('Admin secret is missing');
    }

    const expectedSecret = this.configService.get<string>('ADMIN_SECRET');

    if (!expectedSecret) {
      // If ADMIN_SECRET is not configured in the environment, we should deny access
      // to prevent unintended access.
      throw new UnauthorizedException('Admin features are not configured');
    }

    if (adminSecretHeader !== expectedSecret) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    return true;
  }
}
