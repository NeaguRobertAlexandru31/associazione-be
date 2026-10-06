import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { DocScanService } from './doc-scan.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { SubmitScanDto } from './dto/submit-scan.dto';

@Controller('doc-scan')
export class DocScanController {
  constructor(private readonly service: DocScanService) {}

  // ── Admin ────────────────────────────────────────────────────────────

  @Post('token')
  @UseGuards(AdminGuard)
  createToken(@Body() dto: CreateTokenDto) {
    return this.service.createToken(dto);
  }

  @Get('tokens')
  @UseGuards(AdminGuard)
  getAll() {
    return this.service.getAll();
  }

  @Delete('token/:id')
  @UseGuards(AdminGuard)
  deleteToken(@Param('id') id: string) {
    return this.service.deleteToken(id);
  }

  // ── Pubblico (via token) ─────────────────────────────────────────────

  @Get('validate')
  validate(@Query('token') token: string) {
    return this.service.getToken(token);
  }

  @Post('presign')
  presign(
    @Query('token') token: string,
    @Body('contentType') contentType: string,
  ) {
    return this.service.presignUpload(token, contentType);
  }

  @Post('submit')
  submit(@Query('token') token: string, @Body() dto: SubmitScanDto) {
    return this.service.submit(token, dto);
  }
}
