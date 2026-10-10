import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { BookingsService } from '../bookings/bookings.service';
import { PrismaService } from '../prisma/prisma.service';

export interface TelegramNotifyOpts {
  title: string;
  cover?: string | null;
  description?: string | null;
  link: string;
  lines?: string[];
}

interface Session {
  eventId: string;
  eventName: string;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private offset = 0;
  private polling = false;

  // chatId → evento selezionato per la sessione di scan
  private readonly sessions = new Map<string, Session>();

  private get token()        { return process.env.TELEGRAM_BOT_TOKEN; }
  private get channel()      { return process.env.TELEGRAM_CHANNEL_ID; }
  private get adminChannel() { return process.env.TELEGRAM_ADMIN_CHANNEL_ID; }
  private get adminIds() {
    return (process.env.TELEGRAM_ADMIN_IDS ?? '')
      .split(',').map(s => s.trim()).filter(Boolean);
  }

  constructor(
    private readonly bookings: BookingsService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    if (!this.token) return;
    this.setupCommands().catch(err => this.logger.error('setupCommands failed', err));
    if (process.env.NODE_ENV === 'production') {
      // In produzione (Lambda) usa webhook — il polling non è compatibile con Lambda
      const webhookUrl = `${process.env.APP_PUBLIC_URL}/telegram/webhook`;
      fetch(`https://api.telegram.org/bot${this.token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      }).catch(err => this.logger.error('setWebhook failed', err));
    } else {
      // In locale usa polling
      fetch(`https://api.telegram.org/bot${this.token}/deleteWebhook`)
        .then(() => this.startPolling())
        .catch(err => this.logger.error('deleteWebhook failed', err));
    }
  }

  private async setupCommands(): Promise<void> {
    const base = `https://api.telegram.org/bot${this.token}`;

    // Comandi visibili a tutti
    await fetch(`${base}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Avvia il bot' },
        ],
      }),
    });

    // Comandi extra visibili solo agli admin (scope per singolo utente)
    const adminCommands = [
      { command: 'start',       description: '🤖 Avvia il bot' },
      { command: 'eventi',      description: '📅 Prossimi eventi' },
      { command: 'soci',        description: '👥 Stato soci' },
      { command: 'nuovisoci',   description: '🆕 Iscrizioni in attesa' },
      { command: 'prenotazioni',description: '🎫 Prenotazioni evento' },
      { command: 'checkqr',     description: '📷 Verifica biglietti QR' },
      { command: 'stop',        description: '🛑 Termina sessione QR' },
    ];

    await Promise.all(
      this.adminIds.map(id =>
        fetch(`${base}/setMyCommands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commands: adminCommands,
            scope: { type: 'chat', chat_id: Number(id) },
          }),
        }),
      ),
    );
  }

  // ── Polling (solo locale) ────────────────────────────────────────────────────

  private startPolling() {
    if (this.polling) return;
    this.polling = true;
    this.poll();
  }

  private async poll() {
    while (this.polling) {
      try {
        const res  = await fetch(
          `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.offset}&timeout=30`,
        );
        const data = (await res.json()) as any;
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            this.handleUpdate(update).catch(err =>
              this.logger.error('handleUpdate failed', err),
            );
          }
        }
      } catch (err) {
        this.logger.warn('Polling error, retry in 5s', err);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  // ── Gestione update ──────────────────────────────────────────────────────────

  async handleUpdate(update: any): Promise<void> {
    // Callback da bottone inline (selezione evento)
    if (update?.callback_query) {
      await this.handleCallback(update.callback_query);
      return;
    }

    const message = update?.message;
    if (!message) return;

    const chatId = String(message.chat?.id ?? '');
    const text   = message.text as string | undefined;

    if (text === '/start') {
      const isAdmin = this.adminIds.includes(chatId);
      const menu = isAdmin
        ? `📅 /eventi — Prossimi eventi\n👥 /soci — Stato soci\n🆕 /nuovisoci — Iscrizioni in attesa\n🎫 /prenotazioni — Prenotazioni evento\n📷 /checkqr — Verifica biglietti QR`
        : '';
      await this.sendMessage(chatId,
        `Ciao! Sono il bot dell'associazione.${isAdmin ? `\n\n*Comandi disponibili:*\n${menu}` : ''}\n\n🆔 Il tuo chat ID è: \`${chatId}\``,
        'Markdown',
      );
      return;
    }

    if (!this.adminIds.includes(chatId)) {
      await this.sendMessage(chatId, '⛔ Non sei autorizzato ad usare questo bot.');
      return;
    }

    if (text === '/eventi') {
      await this.cmdEventi(chatId);
      return;
    }

    if (text === '/soci') {
      await this.cmdSoci(chatId);
      return;
    }

    if (text === '/nuovisoci') {
      await this.cmdNuoviSoci(chatId);
      return;
    }

    if (text === '/prenotazioni') {
      await this.cmdPrenotazioni(chatId);
      return;
    }

    if (text === '/checkqr') {
      await this.startCheckQr(chatId);
      return;
    }

    if (text === '/stop') {
      this.sessions.delete(chatId);
      await this.sendMessage(chatId, '🛑 Sessione di verifica terminata.');
      return;
    }

    // Foto / documento → scan QR
    const photo    = message.photo as any[] | undefined;
    const document = message.document as any | undefined;

    if (photo?.length || document) {
      await this.handleQrScan(chatId, document?.file_id ?? photo![photo!.length - 1].file_id);
      return;
    }

    await this.sendMessage(chatId, 'Usa il menu per scegliere un\'azione.');
  }

  // ── Selezione evento ─────────────────────────────────────────────────────────

  private async startCheckQr(chatId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = await this.prisma.event.findMany({
      where: { date: { gte: today } },
      orderBy: { date: 'asc' },
      select: { id: true, name: true, date: true },
      take: 10,
    });

    if (!events.length) {
      await this.sendMessage(chatId, '📭 Nessun evento futuro trovato.');
      return;
    }

    const buttons = events.map(e => [{
      text: `${e.name} — ${new Date(e.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`,
      callback_data: `event:${e.id}:${e.name}`,
    }]);

    await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '📅 Seleziona l\'evento da verificare:',
        reply_markup: { inline_keyboard: buttons },
      }),
    });
  }

  private async handleCallback(callback: any): Promise<void> {
    const chatId = String(callback.message?.chat?.id ?? '');
    const data   = callback.data as string;

    if (!this.adminIds.includes(chatId)) return;

    await fetch(`https://api.telegram.org/bot${this.token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callback.id }),
    });

    if (data.startsWith('event:')) {
      const parts     = data.split(':');
      const eventId   = parts[1];
      const eventName = parts.slice(2).join(':');

      this.sessions.set(chatId, { eventId, eventName });

      await this.sendMessage(chatId,
        `✅ Evento selezionato: *${eventName}*\n\nInvia la foto del QR code del biglietto.\nUsa /stop per terminare la sessione.`,
        'Markdown',
      );
      return;
    }

    if (data.startsWith('bookings:')) {
      const slug = data.replace('bookings:', '');
      await this.showPrenotazioni(chatId, slug);
      return;
    }
  }

  // ── Comando /eventi ──────────────────────────────────────────────────────────

  private async cmdEventi(chatId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = await this.prisma.event.findMany({
      where: { date: { gte: today } },
      orderBy: { date: 'asc' },
      select: { id: true, name: true, date: true, time: true, location: true, hasCapacity: true, capacity: true },
      take: 10,
    });

    if (!events.length) {
      await this.sendMessage(chatId, '📭 Nessun evento futuro trovato.');
      return;
    }

    const confirmedSeatsMap = await Promise.all(
      events.map(e =>
        this.prisma.booking.aggregate({
          where: { eventId: e.id, status: 'confirmed' },
          _sum: { seats: true },
        }).then(r => ({ id: e.id, occupied: r._sum.seats ?? 0 })),
      ),
    );
    const seatsMap = new Map(confirmedSeatsMap.map(r => [r.id, r.occupied]));

    const lines = events.map(e => {
      const date = new Date(e.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
      const occupied = seatsMap.get(e.id) ?? 0;
      const capacityInfo = e.hasCapacity && e.capacity != null
        ? ` — ${occupied}/${e.capacity} posti`
        : '';
      return `📅 *${e.name}*\n${date} alle ${e.time} · ${e.location}${capacityInfo}`;
    });

    await this.sendMessage(chatId, lines.join('\n\n'), 'Markdown');
  }

  // ── Comando /soci ────────────────────────────────────────────────────────────

  private async cmdSoci(chatId: string): Promise<void> {
    const [attivi, inAttesa, inCorso, rifiutati] = await Promise.all([
      this.prisma.member.count({ where: { status: 'attivo', deletedAt: null } }),
      this.prisma.member.count({ where: { status: 'in_attesa_pagamento', deletedAt: null } }),
      this.prisma.member.count({ where: { status: 'pagamento_in_corso', deletedAt: null } }),
      this.prisma.member.count({ where: { status: 'rifiutato', deletedAt: null } }),
    ]);

    await this.sendMessage(chatId, [
      `👥 *Stato soci*`,
      ``,
      `✅ Attivi: *${attivi}*`,
      `⏳ In attesa pagamento: *${inAttesa}*`,
      `🔄 Pagamento in corso: *${inCorso}*`,
      `❌ Rifiutati: *${rifiutati}*`,
      ``,
      `📊 Totale: *${attivi + inAttesa + inCorso + rifiutati}*`,
    ].join('\n'), 'Markdown');
  }

  // ── Comando /nuovisoci ───────────────────────────────────────────────────────

  private async cmdNuoviSoci(chatId: string): Promise<void> {
    const soci = await this.prisma.member.findMany({
      where: { status: { in: ['in_attesa_pagamento', 'pagamento_in_corso'] }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { firstName: true, lastName: true, email: true, status: true, createdAt: true, membershipYear: true },
      take: 15,
    });

    if (!soci.length) {
      await this.sendMessage(chatId, '✅ Nessuna iscrizione in attesa.');
      return;
    }

    const lines = soci.map(s => {
      const data = new Date(s.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      const stato = s.status === 'pagamento_in_corso' ? '🔄' : '⏳';
      return `${stato} *${s.firstName} ${s.lastName}*\n${s.email} · ${data}${s.membershipYear ? ` · ${s.membershipYear}` : ''}`;
    });

    await this.sendMessage(chatId, `🆕 *Iscrizioni in attesa (${soci.length})*\n\n${lines.join('\n\n')}`, 'Markdown');
  }

  // ── Comando /prenotazioni ────────────────────────────────────────────────────

  private async cmdPrenotazioni(chatId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = await this.prisma.event.findMany({
      where: { date: { gte: today }, hasCapacity: true },
      orderBy: { date: 'asc' },
      select: { slug: true, name: true, date: true },
      take: 10,
    });

    if (!events.length) {
      await this.sendMessage(chatId, '📭 Nessun evento con prenotazioni attive.');
      return;
    }

    const buttons = events.map(e => [{
      text: `${e.name} — ${new Date(e.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`,
      callback_data: `bookings:${e.slug}`,
    }]);

    await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🎫 Seleziona l\'evento:',
        reply_markup: { inline_keyboard: buttons },
      }),
    });
  }

  private async showPrenotazioni(chatId: string, slug: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, name: true, capacity: true },
    });
    if (!event) { await this.sendMessage(chatId, '⚠️ Evento non trovato.'); return; }

    const [bookings, agg] = await Promise.all([
      this.prisma.booking.findMany({
        where: { eventId: event.id, status: { not: 'cancelled' } },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        select: { name: true, email: true, seats: true, status: true, position: true },
      }),
      this.prisma.booking.aggregate({
        where: { eventId: event.id, status: 'confirmed' },
        _sum: { seats: true },
      }),
    ]);

    const occupied = agg._sum.seats ?? 0;
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const waitlist  = bookings.filter(b => b.status === 'waitlist');

    const header = [
      `🎫 *${event.name}*`,
      `${occupied}/${event.capacity ?? '∞'} posti occupati`,
      '',
    ].join('\n');

    const confLines = confirmed.map(b => `✅ ${b.name} (${b.seats} posto${b.seats > 1 ? 'i' : ''})`);
    const waitLines = waitlist.map(b => `⏳ #${b.position} ${b.name} (${b.seats})`);

    const body = [
      header,
      confirmed.length ? `*Confermati (${confirmed.length}):*\n${confLines.join('\n')}` : 'Nessuna prenotazione confermata.',
      waitlist.length  ? `\n*Lista d\'attesa (${waitlist.length}):*\n${waitLines.join('\n')}` : '',
    ].filter(Boolean).join('\n');

    await this.sendMessage(chatId, body, 'Markdown');
  }

  // ── Scan QR ──────────────────────────────────────────────────────────────────

  private async handleQrScan(chatId: string, fileId: string): Promise<void> {
    const session = this.sessions.get(chatId);
    if (!session) {
      await this.sendMessage(chatId, 'Usa /checkqr per selezionare prima l\'evento.');
      return;
    }

    try {
      const qrPayload = await this.decodeQrFromTelegram(fileId);
      const result    = await this.bookings.verify(qrPayload);

      // Verifica che il biglietto sia per l'evento selezionato
      if (result.eventId !== session.eventId) {
        await this.sendMessage(chatId, [
          `⚠️ *Biglietto per evento sbagliato*`,
          '',
          `Atteso: *${session.eventName}*`,
          `Trovato: *${result.eventName}*`,
        ].join('\n'), 'Markdown');
        return;
      }

      const eventDate = new Date(result.eventDate).toLocaleDateString('it-IT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });

      if (result.valid) {
        const seatLabel = result.seatNum ? ` (posto ${result.seatNum}/${result.seats})` : '';
        await this.sendMessage(chatId, [
          `✅ *Biglietto valido*${seatLabel}`,
          '',
          `👤 ${result.name}`,
          `📧 ${result.email}`,
          `🎫 ${result.eventName}`,
          `📆 ${eventDate} alle ${result.eventTime}`,
          `📍 ${result.eventLocation}`,
        ].join('\n'), 'Markdown');
      } else {
        await this.sendMessage(chatId, [
          `❌ *Biglietto non valido*`,
          `Stato: ${result.status}`,
        ].join('\n'), 'Markdown');
      }
    } catch (err: any) {
      this.logger.error('QR scan failed', err?.message ?? err);
      const msg = err?.status === 404
        ? '⚠️ Prenotazione non trovata.'
        : '⚠️ Impossibile decodificare il QR. Riprova con una foto più nitida.';
      await this.sendMessage(chatId, msg);
    }
  }

  // ── Notifiche canale admin ───────────────────────────────────────────────────

  async notifyAdmin(text: string): Promise<void> {
    if (!this.token || !this.adminChannel) return;
    await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.adminChannel, text, parse_mode: 'Markdown' }),
    });
  }

  // ── Notifiche canale pubblico ────────────────────────────────────────────────

  async notify(opts: TelegramNotifyOpts): Promise<void> {
    if (!this.token || !this.channel) return;

    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = (opts.lines ?? []).map(l => l.replace(/\*(.*?)\*/g, '<b>$1</b>'));
    const body = [
      `<b>${escape(opts.title)}</b>`,
      ...lines,
      ...(opts.description ? ['', escape(opts.description)] : []),
      '',
      `<a href="${opts.link}">Scopri di più</a>`,
    ].join('\n');

    const payload = { chat_id: this.channel, parse_mode: 'HTML' as const };

    try {
      if (opts.cover) {
        await fetch(`https://api.telegram.org/bot${this.token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, photo: opts.cover, caption: body }),
        });
      } else {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, text: body }),
        });
      }
    } catch (err) {
      this.logger.error('Telegram notify failed', err);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async decodeQrFromTelegram(fileId: string): Promise<string> {
    const fileRes  = await fetch(`https://api.telegram.org/bot${this.token}/getFile?file_id=${fileId}`);
    const fileData = (await fileRes.json()) as any;
    const filePath = fileData.result?.file_path as string;

    const imgRes = await fetch(`https://api.telegram.org/file/bot${this.token}/${filePath}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const tryDecode = async (buf: Buffer): Promise<string | null> => {
      const { data, info } = await sharp(buf)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const code = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
        inversionAttempts: 'attemptBoth',
      });
      return code?.data ?? null;
    };

    for (const size of [1600, 1200, 800, 400]) {
      const resized = await sharp(buffer)
        .resize(size, size, { fit: 'inside', withoutEnlargement: false })
        .sharpen({ sigma: 2 })
        .normalise()
        .png()
        .toBuffer();
      const result = await tryDecode(resized);
      if (result) return result;
    }

    const bw = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: false })
      .greyscale()
      .normalise()
      .threshold(128)
      .png()
      .toBuffer();
    const bwResult = await tryDecode(bw);
    if (bwResult) return bwResult;

    throw new Error('QR non decodificato');
  }

  private async sendMessage(chatId: string, text: string, parseMode?: 'Markdown'): Promise<void> {
    await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...(parseMode ? { parse_mode: parseMode } : {}) }),
    });
  }
}
