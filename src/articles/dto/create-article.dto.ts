import {
  IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ArticleBlockDto {
  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsNotEmpty()
  paragraph: string;

  @IsString()
  @IsOptional()
  image?: string;
}

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleBlockDto)
  blocks: ArticleBlockDto[];

  @IsString()
  @IsOptional()
  cover?: string;
}
