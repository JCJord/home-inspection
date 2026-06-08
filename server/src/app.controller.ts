import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('public/beta-request')
  @HttpCode(HttpStatus.OK)
  async handleBetaRequest(@Body('email') email: string) {
    if (!email) {
      return { success: false, message: 'Email is required' };
    }

    // TODO: When domain is set, implement real mail sender here using Resend or Nodemailer
    // e.g. await resend.emails.send({ from: '...', to: 'juliojc.jord@gmail.com', subject: 'New Beta Request', html: `Email: ${email}` })

    return { success: true, message: 'Beta request received.' };
  }
}
