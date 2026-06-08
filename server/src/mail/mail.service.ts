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

  private getTemplatePath(templateName: string): string {
    // 1. Try production path relative to compiled dist/src/mail/mail.service.js
    const prodPath = path.join(__dirname, '..', '..', 'mail', 'templates', templateName);
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }

    // 2. Try development path relative to src/mail/mail.service.ts
    const devPath = path.join(__dirname, 'templates', templateName);
    if (fs.existsSync(devPath)) {
      return devPath;
    }

    // 3. Fallback to process.cwd() / dist
    const cwdDistPath = path.join(process.cwd(), 'dist', 'mail', 'templates', templateName);
    if (fs.existsSync(cwdDistPath)) {
      return cwdDistPath;
    }

    // 4. Fallback to process.cwd() / src
    const cwdSrcPath = path.join(process.cwd(), 'src', 'mail', 'templates', templateName);
    if (fs.existsSync(cwdSrcPath)) {
      return cwdSrcPath;
    }

    return devPath;
  }

  private getFromEmail(): string {
    return process.env.MAIL_FROM || 'Home Inspection <onboarding@resend.dev>';
  }

  @OnEvent('inspection.scheduled')
  async handleInspectionScheduled(inspection: Inspection) {
    if (!inspection.client_email) {
      this.logger.warn(`No client email found for inspection ${inspection.id}, skipping notification.`);
      return;
    }

    this.logger.log(`Processing scheduled confirmation event for ${inspection.client_email}`);

    try {
      const finalPath = this.getTemplatePath('inspection-scheduled.hbs');

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
        from: this.getFromEmail(),
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

  async sendPasswordResetEmail(email: string, resetLink: string) {
    this.logger.log(`Processing password reset email for ${email}`);
    
    try {
      const finalPath = this.getTemplatePath('password-reset.hbs');

      if (!fs.existsSync(finalPath)) {
        this.logger.error(`Email template not found at ${finalPath}`);
        return;
      }

      const source = fs.readFileSync(finalPath, 'utf8');
      const template = handlebars.compile(source);

      const html = template({
        reset_link: resetLink,
        year: new Date().getFullYear(),
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromEmail(),
        to: email,
        subject: 'Reset Your Password',
        html: html,
      });

      if (error) {
        this.logger.error(`Resend error sending to ${email}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`Password reset email successfully queued for ${email}. ID: ${data?.id}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process password reset email for ${email}`, error.stack);
    }
  }

  async sendReportEmail(targetEmail: string, pdfUrl: string, address: string) {
    this.logger.log(`Processing report ready email for ${targetEmail}`);
    
    try {
      const finalPath = this.getTemplatePath('report-ready.hbs');

      if (!fs.existsSync(finalPath)) {
        this.logger.error(`Email template not found at ${finalPath}`);
        return;
      }

      const source = fs.readFileSync(finalPath, 'utf8');
      const template = handlebars.compile(source);

      const html = template({
        address: address,
        report_link: pdfUrl,
        year: new Date().getFullYear(),
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromEmail(),
        to: targetEmail,
        subject: `Your Inspection Report for ${address} is Ready`,
        html: html,
      });

      if (error) {
        this.logger.error(`Resend error sending to ${targetEmail}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`Report email successfully queued for ${targetEmail}. ID: ${data?.id}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process report email for ${targetEmail}`, error.stack);
    }
  }

  async sendEmailVerification(email: string, verifyLink: string, name: string) {
    this.logger.log(`Processing email verification for ${email}`);
    
    try {
      const finalPath = this.getTemplatePath('email-verification.hbs');

      if (!fs.existsSync(finalPath)) {
        this.logger.error(`Email template not found at ${finalPath}`);
        return;
      }

      const source = fs.readFileSync(finalPath, 'utf8');
      const template = handlebars.compile(source);

      const html = template({
        verify_link: verifyLink,
        name: name || 'there',
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromEmail(),
        to: email,
        subject: 'Verify your email address',
        html: html,
      });

      if (error) {
        this.logger.error(`Resend error sending to ${email}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`Verification email successfully queued for ${email}. ID: ${data?.id}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to process verification email for ${email}`, error.stack);
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

  async sendGenericEmail(to: string, subject: string, html: string, fromOverride?: string) {
    this.logger.log(`Processing generic email for ${to}`);
    try {
      const from = fromOverride || this.getFromEmail();
      const { data, error } = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Resend error sending to ${to}: ${JSON.stringify(error)}`);
        throw new Error(error.message);
      } else {
        this.logger.log(`Generic email successfully queued for ${to}. ID: ${data?.id}`);
        return data;
      }
    } catch (error: any) {
      this.logger.error(`Failed to process generic email for ${to}`, error.stack);
      throw error;
    }
  }
}
