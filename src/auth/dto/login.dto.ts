import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'GIST IdP 로그인 후 발급받은 Authorization Code',
    example: '4CXXgZtlTF5vH0tKGHEZ3chdnTwWVXVSxfShMXiJTO8',
  })
  @IsString() // 문자열인지 확인
  @IsNotEmpty() // 비어있지 않은지 확인
  code: string;

  @ApiProperty({
    description: 'PKCE 보안을 위한 Code Verifier (프론트에서 생성한 값)',
    example: 'abcd...',
  })
  @IsString()
  @IsNotEmpty()
  codeVerifier: string;
}