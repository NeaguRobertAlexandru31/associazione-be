import { Injectable } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class MailService {
  private get client() {
    return new SESClient({ region: process.env.AWS_REGION_NAME ?? 'eu-central-1' });
  }

  async sendReply(opts: {
    fromName:  string;
    fromEmail: string;
    toEmail:   string;
    toName:    string;
    subject:   string;
    message:   string;
  }): Promise<void> {
    const escaped = opts.message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    await this.client.send(new SendEmailCommand({
      Source:           `${opts.fromName} <${process.env.MAIL_FROM}>`,
      ReplyToAddresses: [opts.fromEmail],
      Destination: {
        ToAddresses: [`${opts.toName} <${opts.toEmail}>`],
      },
      Message: {
        Subject: { Data: opts.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: opts.message,  Charset: 'UTF-8' },
          Html: { Data: `<p style="white-space:pre-wrap">${escaped}</p>`, Charset: 'UTF-8' },
        },
      },
    }));
  }
}
