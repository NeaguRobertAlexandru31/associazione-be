import { IsEmail, IsString } from 'class-validator';

export class MemberLoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
