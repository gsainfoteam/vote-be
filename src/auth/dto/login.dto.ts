import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'GIST IdP에서 발급된 Access Token' })
  @IsString()
  @IsNotEmpty()
  idpToken: string;
}