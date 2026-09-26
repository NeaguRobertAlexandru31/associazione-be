import { Injectable } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class MailService {
  private get client() {
    return new SESClient({
      region: process.env.AWS_REGION_NAME ?? 'eu-central-1',
    });
  }

  private get from() {
    return process.env.MAIL_FROM ?? 'noreply@acr-milano.it';
  }

  private get appUrl() {
    return process.env.CORS_ORIGIN ?? 'https://d24jkgof7wi3hx.cloudfront.net';
  }

  private layout(content: string): string {
    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Associazione Culturale Rumena</title>
</head>
<body style="margin:0;padding:0;background:#f4f3fc;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="display:inline-block;background:#002068;border-radius:16px;padding:16px 28px;">
                <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">A.C.R.</span>
              </div>
              <div style="color:#444653;font-size:13px;margin-top:8px;letter-spacing:1px;">ASSOCIAZIONE CULTURALE RUMENA</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:40px 36px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="color:#444653;font-size:12px;margin:0;">
                Hai ricevuto questa email perché ti sei iscritto/a all'Associazione Culturale Rumena.<br/>
                Per assistenza scrivi a <a href="mailto:${this.from}" style="color:#002068;">${this.from}</a>
              </p>
              <p style="color:#c4c5d5;font-size:11px;margin:12px 0 0;">
                © ${new Date().getFullYear()} Associazione Culturale Rumena — Milano
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendWelcome(opts: {
    firstName: string;
    lastName: string;
    email: string;
    category: string;
    year: number;
  }): Promise<void> {
    const loginUrl = `${this.appUrl}/login`;

    const categoryLabel: Record<string, string> = {
      ordinario: 'Ordinario',
      under26: 'Under 26',
      sostenitore: 'Sostenitore',
    };

    const html = this.layout(`
      <h1 style="color:#002068;font-size:22px;font-weight:700;margin:0 0 8px;">
        Benvenuto/a, ${opts.firstName}!
      </h1>
      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        La tua iscrizione è stata confermata. Sei ufficialmente socio/a dell'Associazione Culturale Rumena per l'anno <strong>${opts.year}</strong>.
      </p>

      <!-- Tessera info -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fc;border-radius:12px;padding:20px;margin-bottom:28px;">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-size:12px;color:#444653;letter-spacing:1px;">SOCIO</p>
            <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#002068;">${opts.firstName.toUpperCase()} ${opts.lastName.toUpperCase()}</p>
            <p style="margin:0;font-size:13px;color:#444653;">Categoria: <strong>${categoryLabel[opts.category] ?? opts.category}</strong> &nbsp;·&nbsp; Anno: <strong>${opts.year}</strong></p>
          </td>
        </tr>
      </table>

      <!-- Istruzioni accesso -->
      <h2 style="color:#002068;font-size:16px;font-weight:600;margin:0 0 12px;">Come accedere alla tua area personale</h2>
      <ol style="color:#444653;font-size:14px;line-height:1.8;margin:0 0 28px;padding-left:20px;">
        <li>Clicca sul pulsante qui sotto oppure vai su <strong>acr-milano.it</strong> e clicca <em>"Accedi"</em></li>
        <li>Inserisci la tua email: <strong>${opts.email}</strong></li>
        <li>Clicca <em>"Continua"</em> — ti verrà chiesto di impostare una password</li>
        <li>Scegli la tua password e accedi alla tua area personale</li>
      </ol>

      <p style="color:#444653;font-size:13px;margin:0 0 20px;line-height:1.6;">
        Nell'area personale trovi la tua <strong>tessera digitale</strong>, i tuoi dati di iscrizione e puoi aggiornare il tuo profilo.
      </p>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${loginUrl}" style="display:inline-block;background:#002068;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.5px;">
              Accedi alla tua area →
            </a>
          </td>
        </tr>
      </table>

      <p style="color:#c4c5d5;font-size:12px;text-align:center;margin:20px 0 0;">
        Oppure copia questo link nel browser:<br/>
        <span style="color:#002068;">${loginUrl}</span>
      </p>
    `);

    const text = `Benvenuto/a ${opts.firstName}!\n\nLa tua iscrizione all'ACR per l'anno ${opts.year} è confermata.\n\nCome accedere:\n1. Vai su ${loginUrl}\n2. Inserisci la tua email: ${opts.email}\n3. Clicca "Continua" e imposta la tua password\n\nPer assistenza: ${this.from}`;

    await this.client.send(
      new SendEmailCommand({
        Source: `Associazione Culturale Rumena <${this.from}>`,
        Destination: {
          ToAddresses: [`${opts.firstName} ${opts.lastName} <${opts.email}>`],
        },
        Message: {
          Subject: {
            Data: `Benvenuto/a nell'ACR — Tessera ${opts.year}`,
            Charset: 'UTF-8',
          },
          Body: {
            Text: { Data: text, Charset: 'UTF-8' },
            Html: { Data: html, Charset: 'UTF-8' },
          },
        },
      }),
    );
  }

  async sendApproved(opts: {
    firstName: string;
    lastName: string;
    email: string;
    category: string;
    year: number;
  }): Promise<void> {
    const loginUrl = `${this.appUrl}/login`;

    const categoryLabel: Record<string, string> = {
      ordinario: 'Ordinario',
      under26: 'Under 26',
      sostenitore: 'Sostenitore',
    };

    const html = this.layout(`
      <h1 style="color:#002068;font-size:22px;font-weight:700;margin:0 0 8px;">
        Iscrizione approvata!
      </h1>
      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        La tua iscrizione all'Associazione Culturale Rumena per l'anno <strong>${opts.year}</strong> è stata <strong>approvata</strong>. Sei ufficialmente socio/a attivo/a!
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fc;border-radius:12px;padding:20px;margin-bottom:28px;">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-size:12px;color:#444653;letter-spacing:1px;">SOCIO</p>
            <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#002068;">${opts.firstName.toUpperCase()} ${opts.lastName.toUpperCase()}</p>
            <p style="margin:0;font-size:13px;color:#444653;">Categoria: <strong>${categoryLabel[opts.category] ?? opts.category}</strong> &nbsp;·&nbsp; Anno: <strong>${opts.year}</strong></p>
          </td>
        </tr>
      </table>

      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        Accedi alla tua area personale per visualizzare la tua <strong>tessera digitale</strong> e gestire il tuo profilo.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${loginUrl}" style="display:inline-block;background:#002068;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.5px;">
              Accedi alla tua area →
            </a>
          </td>
        </tr>
      </table>
    `);

    const text = `La tua iscrizione all'ACR per l'anno ${opts.year} è stata approvata!\n\nAccedi alla tua area personale: ${loginUrl}\n\nPer assistenza: ${this.from}`;

    await this.client.send(
      new SendEmailCommand({
        Source: `Associazione Culturale Rumena <${this.from}>`,
        Destination: {
          ToAddresses: [`${opts.firstName} ${opts.lastName} <${opts.email}>`],
        },
        Message: {
          Subject: {
            Data: `Iscrizione approvata — ACR ${opts.year}`,
            Charset: 'UTF-8',
          },
          Body: {
            Text: { Data: text, Charset: 'UTF-8' },
            Html: { Data: html, Charset: 'UTF-8' },
          },
        },
      }),
    );
  }

  async sendRejected(opts: {
    firstName: string;
    lastName: string;
    email: string;
    year: number;
    reason?: string;
  }): Promise<void> {
    const html = this.layout(`
      <h1 style="color:#002068;font-size:22px;font-weight:700;margin:0 0 8px;">
        Aggiornamento sulla tua iscrizione
      </h1>
      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        Ci dispiace informarti che la tua richiesta di iscrizione all'Associazione Culturale Rumena per l'anno <strong>${opts.year}</strong> non è stata accettata.
      </p>

      ${
        opts.reason
          ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fc;border-radius:12px;padding:20px;margin-bottom:28px;">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-size:12px;color:#444653;letter-spacing:1px;">MOTIVAZIONE</p>
            <p style="margin:0;font-size:14px;color:#444653;line-height:1.6;">${opts.reason}</p>
          </td>
        </tr>
      </table>
      `
          : ''
      }

      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        Per ulteriori informazioni o chiarimenti, contattaci rispondendo a questa email.
      </p>
    `);

    const text = `Gentile ${opts.firstName},\n\nLa tua richiesta di iscrizione all'ACR per l'anno ${opts.year} non è stata accettata.${opts.reason ? `\n\nMotivazione: ${opts.reason}` : ''}\n\nPer chiarimenti scrivi a: ${this.from}`;

    await this.client.send(
      new SendEmailCommand({
        Source: `Associazione Culturale Rumena <${this.from}>`,
        Destination: {
          ToAddresses: [`${opts.firstName} ${opts.lastName} <${opts.email}>`],
        },
        Message: {
          Subject: {
            Data: `Esito iscrizione ACR ${opts.year}`,
            Charset: 'UTF-8',
          },
          Body: {
            Text: { Data: text, Charset: 'UTF-8' },
            Html: { Data: html, Charset: 'UTF-8' },
          },
        },
      }),
    );
  }

  async sendDonationReceipt(opts: {
    email: string;
    name: string;
    amount: number;
    frequency: string;
  }): Promise<void> {
    const frequencyLabel =
      opts.frequency === 'monthly' ? 'mensile' : 'una tantum';
    const amountFmt = opts.amount.toLocaleString('it-IT', {
      style: 'currency',
      currency: 'EUR',
    });

    const html = this.layout(`
      <h1 style="color:#002068;font-size:22px;font-weight:700;margin:0 0 8px;">
        Grazie per la tua donazione!
      </h1>
      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        Abbiamo ricevuto la tua donazione all'Associazione Culturale Rumena. Il tuo contributo fa la differenza.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fc;border-radius:12px;padding:20px;margin-bottom:28px;">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-size:12px;color:#444653;letter-spacing:1px;">RIEPILOGO DONAZIONE</p>
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#002068;">${amountFmt}</p>
            <p style="margin:0;font-size:13px;color:#444653;">Tipo: <strong>${frequencyLabel}</strong></p>
          </td>
        </tr>
      </table>

      <p style="color:#444653;font-size:13px;margin:0;line-height:1.6;">
        Questa email è la tua ricevuta. Conservala per eventuali detrazioni fiscali.<br/>
        Per qualsiasi domanda scrivi a <a href="mailto:${this.from}" style="color:#002068;">${this.from}</a>.
      </p>
    `);

    const text = `Grazie per la tua donazione di ${amountFmt} (${frequencyLabel}) all'ACR.\n\nConserva questa email come ricevuta.\n\nPer assistenza: ${this.from}`;

    await this.client.send(
      new SendEmailCommand({
        Source: `Associazione Culturale Rumena <${this.from}>`,
        Destination: { ToAddresses: [`${opts.name} <${opts.email}>`] },
        Message: {
          Subject: {
            Data: `Ricevuta donazione — ${amountFmt}`,
            Charset: 'UTF-8',
          },
          Body: {
            Text: { Data: text, Charset: 'UTF-8' },
            Html: { Data: html, Charset: 'UTF-8' },
          },
        },
      }),
    );
  }

  async sendNewRegistrationAlert(opts: {
    firstName: string;
    lastName: string;
    email: string;
    category: string;
    year: number;
    paymentMethod: string;
    adminEmail: string;
  }): Promise<void> {
    const categoryLabel: Record<string, string> = {
      ordinario: 'Ordinario',
      under26: 'Under 26',
      sostenitore: 'Sostenitore',
    };

    const paymentLabel: Record<string, string> = {
      contanti: 'Contanti (in sede)',
      online: 'Online (carta/bonifico)',
    };

    const membersUrl = `${this.appUrl}/admin/members`;

    const html = this.layout(`
      <h1 style="color:#002068;font-size:22px;font-weight:700;margin:0 0 8px;">
        Nuova richiesta di iscrizione
      </h1>
      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        È arrivata una nuova richiesta di iscrizione per l'anno <strong>${opts.year}</strong> da approvare.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fc;border-radius:12px;padding:20px;margin-bottom:28px;">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-size:12px;color:#444653;letter-spacing:1px;">NUOVO SOCIO</p>
            <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#002068;">${opts.firstName.toUpperCase()} ${opts.lastName.toUpperCase()}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#444653;">Email: <strong>${opts.email}</strong></p>
            <p style="margin:0 0 6px;font-size:13px;color:#444653;">Categoria: <strong>${categoryLabel[opts.category] ?? opts.category}</strong></p>
            <p style="margin:0;font-size:13px;color:#444653;">Pagamento: <strong>${paymentLabel[opts.paymentMethod] ?? opts.paymentMethod}</strong></p>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${membersUrl}" style="display:inline-block;background:#002068;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.5px;">
              Gestisci iscrizioni →
            </a>
          </td>
        </tr>
      </table>
    `);

    const text = `Nuova richiesta di iscrizione ACR ${opts.year}\n\nSocio: ${opts.firstName} ${opts.lastName}\nEmail: ${opts.email}\nCategoria: ${categoryLabel[opts.category] ?? opts.category}\nPagamento: ${paymentLabel[opts.paymentMethod] ?? opts.paymentMethod}\n\nGestisci: ${membersUrl}`;

    await this.client.send(
      new SendEmailCommand({
        Source: `Associazione Culturale Rumena <${this.from}>`,
        Destination: { ToAddresses: [opts.adminEmail] },
        Message: {
          Subject: {
            Data: `Nuova iscrizione — ${opts.firstName} ${opts.lastName}`,
            Charset: 'UTF-8',
          },
          Body: {
            Text: { Data: text, Charset: 'UTF-8' },
            Html: { Data: html, Charset: 'UTF-8' },
          },
        },
      }),
    );
  }

  async sendReply(opts: {
    fromName: string;
    fromEmail: string;
    toEmail: string;
    toName: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const escaped = opts.message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    await this.client.send(
      new SendEmailCommand({
        Source: `${opts.fromName} <${process.env.MAIL_FROM}>`,
        ReplyToAddresses: [opts.fromEmail],
        Destination: {
          ToAddresses: [`${opts.toName} <${opts.toEmail}>`],
        },
        Message: {
          Subject: { Data: opts.subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: opts.message, Charset: 'UTF-8' },
            Html: {
              Data: `<p style="white-space:pre-wrap">${escaped}</p>`,
              Charset: 'UTF-8',
            },
          },
        },
      }),
    );
  }
}
