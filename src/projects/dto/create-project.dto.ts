import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ProjectCategory {
  cultura    = 'cultura',
  tradizione = 'tradizione',
  sociale    = 'sociale',
  educazione = 'educazione',
}

export enum ProjectStatus {
  ongoing   = 'ongoing',
  completed = 'completed',
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ProjectCategory)
  category: ProjectCategory;

  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}
