import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Resend } from 'resend';
import { Inspection } from '../inspections/inspection.entity';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  @OnEvent('inspection.scheduled')
  async handleInspectionScheduled(inspection: Inspection) {
    if (!inspection.client_email) {
      this.logger.warn(`No client email found for inspection ${inspection.id}, skipping notification.`);
      return;
    }

    this.logger.log(`Processing scheduled confirmation event for ${inspection.client_email}`);

    try {
      // Resolve template path (handles both dev and prod/dist locations)
      const templatePath = path.join(process.cwd(), 'dist', 'mail', 'templates', 'inspection-scheduled.hbs');
      const finalPath = fs.existsSync(templatePath) 
        ? templatePath 
        : path.join(process.cwd(), 'src', 'mail', 'templates', 'inspection-scheduled.hbs');

      if (!fs.existsSync(finalPath)) {
        this.logger.error(`Email template not found at ${finalPath}`);
        return;
      }

      const source = fs.readFileSync(finalPath, 'utf8');
      const template = handlebars.compile(source);

      const html = template({
        client_name: inspection.client_name,
        address: inspection.address,
        date: this.formatDate(inspection.scheduled_date),
        price: inspection.agreed_price ? `$${Number(inspection.agreed_price).toFixed(2)}` : 'TBD',
        inspector_name: inspection.inspector?.name || 'Your Professional Inspector'
      });

      const { data, error } = await this.resend.emails.send({
        from: 'Home Inspection <onboarding@resend.dev>',
        to: inspection.client_email,
        subject: `Confirmation: Inspection Scheduled for ${inspection.address}`,
        html: html,
      });

      if (error) {
        this.logger.error(`Resend error sending to ${inspection.client_email}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`Email successfully queued via Resend for ${inspection.client_email}. ID: ${data?.id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process email for ${inspection.client_email}`, error.stack);
    }
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
