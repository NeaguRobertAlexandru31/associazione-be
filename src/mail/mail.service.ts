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

  async sendBookingConfirmation(opts: {
    booking: { id: string; name: string; email: string; seats: number; cancelToken: string; createdAt: Date };
    event: { name: string; date: Date | string; time: string; location: string };
    qrUrls: string[];
  }): Promise<void> {
    const { booking, event, qrUrls } = opts;
    const dateStr = new Date(event.date).toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const cancelUrl = `${this.appUrl}/bookings/cancel/${booking.cancelToken}`;
    const toGCalDate = (date: Date | string, time: string, addHours = 0): string => {
      const [h, m] = time.replace('.', ':').split(':').map(Number);
      const [year, month, day] = new Date(date).toISOString().slice(0, 10).split('-').map(Number);
      const d = new Date(year, month - 1, day, (h || 0) + addHours, m || 0, 0);
      const p = (n: number) => String(n).padStart(2, '0');
      return `${year}${p(month)}${p(day)}T${p(d.getHours())}${p(d.getMinutes())}00`;
    };
    const gcalStart = toGCalDate(event.date, event.time);
    const gcalEnd   = toGCalDate(event.date, event.time, 2);
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(`Prenotazione: ${booking.name} — ${booking.seats} posto/i`)}&location=${encodeURIComponent(event.location)}`;

    const ticketBlock = (qrUrl: string, seatIndex: number) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #002068;border-radius:16px;overflow:hidden;margin-bottom:${seatIndex < booking.seats - 1 ? '20px' : '28px'};">
        <!-- Banda superiore -->
        <tr>
          <td style="background:#002068;padding:20px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Biglietto di prenotazione</p>
                  <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.3;">${event.name}</p>
                </td>
                <td align="right" style="vertical-align:top;">
                  <div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:8px 14px;text-align:center;">
                    <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${seatIndex + 1}/${booking.seats}</p>
                    <p style="margin:2px 0 0;color:rgba(255,255,255,0.7);font-size:10px;letter-spacing:1px;">POSTO</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Separatore perforato -->
        <tr>
          <td style="padding:0 16px;background:#ffffff;">
            <div style="border-top:2px dashed #e0e0e0;margin:0;"></div>
          </td>
        </tr>
        <!-- Dettagli evento + QR -->
        <tr>
          <td style="padding:20px 28px;background:#ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:12px;">
                        <p style="margin:0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Data</p>
                        <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#002068;">${dateStr}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:12px;">
                        <p style="margin:0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Orario</p>
                        <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#002068;">${event.time}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:12px;">
                        <p style="margin:0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Luogo</p>
                        <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#002068;">${event.location}</p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <p style="margin:0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Intestatario</p>
                        <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#002068;">${booking.name}</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" style="vertical-align:middle;padding-left:16px;">
                  <img src="${qrUrl}" width="120" height="120" alt="QR prenotazione"
                       style="display:block;border-radius:8px;border:1px solid #e0e0e0;" />
                  <p style="margin:4px 0 0;font-size:9px;color:#aaa;text-align:center;letter-spacing:0.5px;">SCANNERIZZA</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Banda codice -->
        <tr>
          <td style="background:#f4f3fc;padding:14px 28px;border-top:2px dashed #e0e0e0;">
            <p style="margin:0;font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;">Codice prenotazione</p>
            <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:#002068;font-family:monospace;letter-spacing:2px;">${booking.id.toUpperCase().slice(0, 12)}-${seatIndex + 1}</p>
          </td>
        </tr>
      </table>`;

    const ticketsHtml = qrUrls.map((url, i) => ticketBlock(url, i)).join('');

    const html = this.layout(`
      ${ticketsHtml}

      <!-- CTA Calendario -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td align="center">
            <a href="${gcalUrl}" target="_blank" style="display:inline-block;background:#002068;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px;">
              📅 Aggiungi a Google Calendar
            </a>
          </td>
        </tr>
      </table>

      <!-- Link annullamento -->
      <p style="text-align:center;font-size:12px;color:#888;margin:0;">
        Hai cambiato programma?
        <a href="${cancelUrl}" style="color:#002068;font-weight:600;">Annulla la prenotazione</a>
      </p>
    `);

    const text = `Prenotazione confermata — ${event.name}\n\nNome: ${booking.name}\nData: ${dateStr} ore ${event.time}\nLuogo: ${event.location}\nPosti: ${booking.seats}\nCodice: ${booking.id.toUpperCase().slice(0, 12)}\n\nAggiungi al calendario: ${gcalUrl}\nAnnulla: ${cancelUrl}`;

    await this.client.send(
      new SendEmailCommand({
        Source: `Associazione Culturale Rumena <${this.from}>`,
        Destination: { ToAddresses: [`${booking.name} <${booking.email}>`] },
        Message: {
          Subject: { Data: `Prenotazione confermata — ${event.name}`, Charset: 'UTF-8' },
          Body: {
            Text: { Data: text, Charset: 'UTF-8' },
            Html: { Data: html, Charset: 'UTF-8' },
          },
        },
      }),
    );
  }

  async sendBookingWaitlist(opts: {
    booking: { id: string; name: string; email: string; seats: number };
    event: { name: string; date: Date | string; time: string; location: string };
    position: number;
  }): Promise<void> {
    const { booking, event, position } = opts;
    const dateStr = new Date(event.date).toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const html = this.layout(`
      <h1 style="color:#002068;font-size:22px;font-weight:700;margin:0 0 8px;">
        Sei in lista d'attesa
      </h1>
      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        L'evento <strong>${event.name}</strong> del <em>${dateStr}</em> è al completo.<br/>
        Sei stato/a inserito/a in lista d'attesa.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fc;border-radius:12px;padding:20px;margin-bottom:28px;">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-size:12px;color:#444653;letter-spacing:1px;">LA TUA POSIZIONE IN LISTA</p>
            <p style="margin:0;font-size:36px;font-weight:700;color:#002068;">#${position}</p>
            <p style="margin:8px 0 0;font-size:13px;color:#444653;">
              ${booking.name} · ${booking.seats} ${booking.seats === 1 ? 'posto' : 'posti'}
            </p>
          </td>
        </tr>
      </table>

      <p style="color:#444653;font-size:14px;margin:0;line-height:1.6;">
        Se un posto si libera, ti contatteremo automaticamente a questo indirizzo email con una nuova conferma e il biglietto.<br/><br/>
        Per qualsiasi informazione scrivi a <a href="mailto:${this.from}" style="color:#002068;">${this.from}</a>
      </p>
    `);

    const text = `Lista d'attesa — ${event.name}\n\nSei in posizione #${position} nella lista d'attesa.\nTi avviseremo se si libera un posto.\n\nEvento: ${dateStr} ore ${event.time} — ${event.location}\nPosti richiesti: ${booking.seats}`;

    await this.client.send(
      new SendEmailCommand({
        Source: `Associazione Culturale Rumena <${this.from}>`,
        Destination: { ToAddresses: [`${booking.name} <${booking.email}>`] },
        Message: {
          Subject: { Data: `Lista d'attesa — ${event.name}`, Charset: 'UTF-8' },
          Body: {
            Text: { Data: text, Charset: 'UTF-8' },
            Html: { Data: html, Charset: 'UTF-8' },
          },
        },
      }),
    );
  }

  async sendPhotoUploadAlert(opts: {
    uploaderName: string;
    uploaderEmail: string | null;
    isMember: boolean;
    eventName: string;
    eventDate: string;
    uploaded: number;
    dashboardUrl: string;
  }): Promise<void> {
    const dateStr = new Date(opts.eventDate).toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    const html = this.layout(`
      <h1 style="color:#002068;font-size:22px;font-weight:700;margin:0 0 8px;">
        Nuove foto caricate
      </h1>
      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        Un partecipante ha appena caricato <strong>${opts.uploaded} ${opts.uploaded === 1 ? 'foto' : 'foto'}</strong>
        per l'evento <strong>${opts.eventName}</strong> del <em>${dateStr}</em>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fc;border-radius:12px;padding:20px;margin-bottom:28px;">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-size:12px;color:#444653;letter-spacing:1px;">CHI HA CARICATO</p>
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#002068;">${opts.uploaderName}</p>
            ${opts.uploaderEmail ? `<p style="margin:0 0 6px;font-size:13px;color:#444653;">Email: <strong>${opts.uploaderEmail}</strong></p>` : '<p style="margin:0 0 6px;font-size:13px;color:#444653;">Email: <em>non fornita</em></p>'}
            <p style="margin:0;font-size:13px;color:#444653;">
              Socio verificato: <strong>${opts.isMember ? '✓ Sì' : '✗ No'}</strong>
            </p>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${opts.dashboardUrl}" style="display:inline-block;background:#002068;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.5px;">
              Vai alla dashboard eventi →
            </a>
          </td>
        </tr>
      </table>
    `);

    const text = `Nuove foto caricate\n\nChi: ${opts.uploaderName}${opts.uploaderEmail ? ` (${opts.uploaderEmail})` : ''}\nSocio: ${opts.isMember ? 'Sì' : 'No'}\nEvento: ${opts.eventName} — ${dateStr}\nFoto caricate: ${opts.uploaded}\n\nDashboard: ${opts.dashboardUrl}`;

    await this.client.send(
      new SendEmailCommand({
        Source: `Associazione Culturale Rumena <${this.from}>`,
        Destination: { ToAddresses: [adminEmail] },
        Message: {
          Subject: {
            Data: `📸 ${opts.uploaderName} ha caricato ${opts.uploaded} foto — ${opts.eventName}`,
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

  async sendPhotoThankYou(opts: {
    name: string;
    email: string;
    eventName: string;
    eventDate: string;
    uploaded: number;
    isMember: boolean;
    donationUrl?: string;
    membershipUrl?: string;
  }): Promise<void> {
    const dateStr = new Date(opts.eventDate).toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const memberSection = opts.isMember ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr>
          <td>
            <p style="margin:0;font-size:14px;color:#002068;font-weight:600;">✓ Socio verificato</p>
            <p style="margin:6px 0 0;font-size:13px;color:#444653;line-height:1.6;">
              Le tue foto compaiono con il badge <strong>Socio</strong> nella galleria dell'evento. Grazie per far parte della nostra comunità!
            </p>
          </td>
        </tr>
      </table>
    ` : `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr>
          <td>
            <p style="margin:0 0 6px;font-size:12px;color:#444653;letter-spacing:1px;">VUOI FAR PARTE DELLA NOSTRA COMUNITÀ?</p>
            <p style="margin:0 0 12px;font-size:14px;color:#444653;line-height:1.6;">
              Diventare socio dell'Associazione Culturale Rumena significa partecipare attivamente alla vita culturale, avere accesso a eventi riservati e supportare le nostre iniziative.
            </p>
            <p style="margin:0;font-size:13px;color:#444653;line-height:1.6;">
              La quota annuale è a partire da <strong>€10</strong> per under 26 e <strong>€20</strong> per soci ordinari.
            </p>
          </td>
        </tr>
      </table>

      ${opts.membershipUrl ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td align="center">
            <a href="${opts.membershipUrl}" style="display:inline-block;background:#002068;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.5px;">
              Diventa socio →
            </a>
          </td>
        </tr>
      </table>
      ` : ''}

      ${opts.donationUrl ? `
      <p style="text-align:center;font-size:13px;color:#444653;margin:0 0 4px;">Oppure, se preferisci, puoi semplicemente</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${opts.donationUrl}" style="display:inline-block;background:#f4f3fc;color:#002068;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px;border:1px solid #002068;">
              Fai una donazione libera
            </a>
          </td>
        </tr>
      </table>
      ` : ''}
    `;

    const html = this.layout(`
      <h1 style="color:#002068;font-size:22px;font-weight:700;margin:0 0 8px;">
        Grazie, ${opts.name}! 📸
      </h1>
      <p style="color:#444653;font-size:14px;margin:0 0 24px;line-height:1.6;">
        Hai condiviso <strong>${opts.uploaded} ${opts.uploaded === 1 ? 'foto' : 'foto'}</strong> dall'evento
        <strong>${opts.eventName}</strong> del <em>${dateStr}</em>.<br/>
        Le tue immagini sono ora visibili nella galleria dell'evento. Grazie per aver immortalato questi momenti con noi!
      </p>

      ${memberSection}
    `);

    const text = opts.isMember
      ? `Grazie ${opts.name}! Hai caricato ${opts.uploaded} foto dall'evento "${opts.eventName}" del ${dateStr}. Le tue foto sono visibili nella galleria con il badge Socio.`
      : `Grazie ${opts.name}! Hai caricato ${opts.uploaded} foto dall'evento "${opts.eventName}" del ${dateStr}.\n\nVuoi diventare socio? ${opts.membershipUrl ?? ''}\nOppure fai una donazione: ${opts.donationUrl ?? ''}`;

    await this.client.send(
      new SendEmailCommand({
        Source: `Associazione Culturale Rumena <${this.from}>`,
        Destination: { ToAddresses: [`${opts.name} <${opts.email}>`] },
        Message: {
          Subject: {
            Data: `Grazie per le tue foto — ${opts.eventName}`,
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
