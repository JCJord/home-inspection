import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { MailService } from './mail/mail.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
  ) { }

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

    try {
      await this.mailService.sendGenericEmail(
        'juliojc.jord@gmail.com',
        'New Beta Request',
        `<p>A new beta request was submitted:</p><p><strong>Email:</strong> ${email}</p>`
      );
    } catch (e) {
      console.error('Failed to send beta request email', e);
    }

    return { success: true, message: 'Beta request received.' };
  }
}
