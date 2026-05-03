import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private get transporter() {
    return nodemailer.createTransport({
      host:   process.env.MAIL_HOST,
      port:   Number(process.env.MAIL_PORT ?? 587),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendReply(opts: {
    fromName:  string;
    fromEmail: string;
    toEmail:   string;
    toName:    string;
    subject:   string;
    message:   string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from:     `"${opts.fromName}" <${process.env.MAIL_USER}>`,
      replyTo:  `"${opts.fromName}" <${opts.fromEmail}>`,
      to:       `"${opts.toName}" <${opts.toEmail}>`,
      subject:  opts.subject,
      text:     opts.message,
      html:     `<p style="white-space:pre-wrap">${opts.message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`,
    });
  }
}
