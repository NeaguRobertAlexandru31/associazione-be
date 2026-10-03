import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');

const LABEL = '© A.C.R.';
const FONT_SIZE = 52;
const PAD_X = 36;
const PAD_Y = 22;
const MARGIN_BOTTOM = 32;

@Injectable()
export class WatermarkService {
  async apply(inputBuffer: Buffer): Promise<Buffer> {
    const { width = 1920, height = 1080 } = await sharp(inputBuffer).metadata();

    const badgeW = Math.ceil(LABEL.length * FONT_SIZE * 0.58 + PAD_X * 2);
    const badgeH = FONT_SIZE + PAD_Y;

    const svg = Buffer.from(
      `<svg width="${badgeW}" height="${badgeH}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${badgeW}" height="${badgeH}" rx="5" fill="rgba(0,0,0,0.50)"/>
        <text x="${badgeW / 2}" y="${FONT_SIZE}" text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="${FONT_SIZE}"
          font-weight="bold" letter-spacing="1.5" fill="rgba(255,255,255,0.92)">
          ${LABEL}
        </text>
      </svg>`,
    );

    const left = Math.floor((width - badgeW) / 2);
    const top  = height - badgeH - MARGIN_BOTTOM;

    return sharp(inputBuffer)
      .composite([{ input: svg, left, top }])
      .webp({ quality: 80 })
      .toBuffer();
  }
}
