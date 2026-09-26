import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum DocumentCategory {
  verbale = 'verbale',
  statuto = 'statuto',
  regolamento = 'regolamento',
  bilancio = 'bilancio',
  altro = 'altro',
}

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsInt()
  fileSize: number;
}
