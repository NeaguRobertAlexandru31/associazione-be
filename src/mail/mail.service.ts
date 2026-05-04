import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private get resend() {
    return new Resend(process.env.RESEND_API_KEY);
  }

  async sendReply(opts: {
    fromName:  string;
    fromEmail: string;
    toEmail:   string;
    toName:    string;
    subject:   string;
    message:   string;
  }): Promise<void> {
    const { error } = await this.resend.emails.send({
      from:     `${opts.fromName} <${process.env.MAIL_FROM}>`,
      replyTo:  opts.fromEmail,
      to:       `${opts.toName} <${opts.toEmail}>`,
      subject:  opts.subject,
      text:     opts.message,
      html:     `<p style="white-space:pre-wrap">${opts.message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
    });

    if (error) throw new Error(error.message);
  }
}
